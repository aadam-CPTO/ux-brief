import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase-server'
import { buildConceptPrompt, parseConceptResponse } from '@/lib/prompts'
import type { GenerateConceptRequest, GenerateConceptResponse } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body: GenerateConceptRequest = await req.json()
    const { respondentId, sessionId, answers, name, role, layer } = body

    // 1. Generate concept via Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: buildConceptPrompt(name, role, layer, answers)
      }]
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const concept = parseConceptResponse(rawText)

    // 2. Persist to Supabase
    const db = createServerClient()

    const { error: conceptError } = await db
      .from('concepts')
      .upsert({
        respondent_id: respondentId,
        session_id: sessionId,
        concept_json: concept,
        raw_text: rawText,
      })

    if (conceptError) throw conceptError

    // 3. Check if session has enough concepts to auto-trigger diff
    const { data: session } = await db
      .from('sessions')
      .select('min_respondents_for_diff')
      .eq('id', sessionId)
      .single()

    const { count } = await db
      .from('concepts')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    if (session && count && count >= session.min_respondents_for_diff) {
      await db
        .from('sessions')
        .update({ status: 'ready_to_diff' })
        .eq('id', sessionId)
    }

    return NextResponse.json({ concept } satisfies GenerateConceptResponse)

  } catch (err) {
    console.error('[/api/generate]', err)
    return NextResponse.json({ error: 'Concept generation failed' }, { status: 500 })
  }
}
