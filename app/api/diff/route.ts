import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase-server'
import { buildDiffPrompt, parseDiffResponse } from '@/lib/prompts'
import type { GenerateDiffRequest, GenerateDiffResponse } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { sessionId }: GenerateDiffRequest = await req.json()
    const db = createServerClient()

    // 1. Fetch all respondents + their concepts for this session
    const { data: respondents, error } = await db
      .from('respondents')
      .select(`
        id, name, role, layer,
        concepts ( concept_json, raw_text )
      `)
      .eq('session_id', sessionId)

    if (error) throw error
    if (!respondents || respondents.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 concepts to diff' }, { status: 400 })
    }

    // 2. Shape data for prompt
    const shaped = respondents.map(r => ({
      name: r.name,
      role: r.role,
      concept: r.concepts?.[0]
        ? { ...r.concepts[0].concept_json, rawText: r.concepts[0].raw_text }
        : null
    })).filter(r => r.concept !== null)

    // 3. Generate diff via Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: buildDiffPrompt(shaped as any) }]
    })

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
    const items = parseDiffResponse(rawText)

    // 4. Upsert diff (replaces previous diff for this session)
    const { error: diffError } = await db
      .from('diffs')
      .upsert({ session_id: sessionId, items, raw_text: rawText }, { onConflict: 'session_id' })

    if (diffError) throw diffError

    // 5. Update session status
    await db
      .from('sessions')
      .update({ status: 'diffed' })
      .eq('id', sessionId)

    return NextResponse.json({
      diff: { sessionId, items, generatedAt: new Date().toISOString(), rawText }
    } satisfies GenerateDiffResponse)

  } catch (err) {
    console.error('[/api/diff]', err)
    return NextResponse.json({ error: 'Diff generation failed' }, { status: 500 })
  }
}
