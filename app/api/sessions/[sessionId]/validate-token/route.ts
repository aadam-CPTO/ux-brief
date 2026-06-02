import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import type { Session } from '@/types'

// GET /api/sessions/:sessionId/validate-token?token=...
// Used by the stakeholder brief page to gate access.
// Returns { valid, session? } where session is camelCased to match the Session type.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const token = req.nextUrl.searchParams.get('token') ?? ''

    if (!sessionId || !token) {
      return NextResponse.json({ valid: false })
    }

    const db = createServerClient()

    // Token must belong to this session and not be expired.
    const { data: invite } = await db
      .from('invite_tokens')
      .select('id, expires_at')
      .eq('session_id', sessionId)
      .eq('token', token)
      .maybeSingle()

    if (!invite || new Date(invite.expires_at) <= new Date()) {
      return NextResponse.json({ valid: false })
    }

    const { data: row } = await db
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (!row) {
      return NextResponse.json({ valid: false })
    }

    const session: Session = {
      id: row.id,
      projectName: row.project_name,
      createdBy: row.created_by,
      status: row.status,
      respondentCount: 0,
      minRespondentsForDiff: row.min_respondents_for_diff,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }

    return NextResponse.json({ valid: true, session })

  } catch (err) {
    console.error('[/api/sessions/:id/validate-token]', err)
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
