import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import type { Answers, Layer } from '@/types'

interface SubmitBody {
  name: string
  role: string
  layer: Layer
  answers: Answers
  token: string
}

// POST /api/sessions/:sessionId/respondents
// Saves a stakeholder submission after re-validating their invite token.
// Returns { respondentId }.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const { name, role, layer, answers, token }: SubmitBody = await req.json()

    if (!sessionId || !token) {
      return NextResponse.json({ error: 'Missing session or token' }, { status: 400 })
    }
    if (!name || !role || !layer) {
      return NextResponse.json({ error: 'Missing name, role, or layer' }, { status: 400 })
    }

    const db = createServerClient()

    // Re-validate the token server-side (the page is public).
    const { data: invite } = await db
      .from('invite_tokens')
      .select('id, expires_at')
      .eq('session_id', sessionId)
      .eq('token', token)
      .maybeSingle()

    if (!invite || new Date(invite.expires_at) <= new Date()) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 })
    }

    // Insert the respondent.
    const { data: respondent, error: insertError } = await db
      .from('respondents')
      .insert({ session_id: sessionId, name, role, layer, answers })
      .select('id')
      .single()

    if (insertError || !respondent) throw insertError

    // Mark the invite as used (one submission per link).
    await db
      .from('invite_tokens')
      .update({ used: true })
      .eq('id', invite.id)

    return NextResponse.json({ respondentId: respondent.id })

  } catch (err) {
    console.error('[/api/sessions/:id/respondents]', err)
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
  }
}
