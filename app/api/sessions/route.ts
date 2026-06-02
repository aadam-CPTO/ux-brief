import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { projectName, createdBy, emails, minRespondents = 2 } = await req.json()
    const db = createServerClient()

    // 1. Create session
    const { data: session, error: sessionError } = await db
      .from('sessions')
      .insert({ project_name: projectName, created_by: createdBy, min_respondents_for_diff: minRespondents })
      .select()
      .single()

    if (sessionError || !session) throw sessionError

    // 2. Generate invite tokens for each email
    const tokens = emails.map((email: string) => ({
      session_id: session.id,
      email,
    }))

    const { data: invites, error: inviteError } = await db
      .from('invite_tokens')
      .insert(tokens)
      .select()

    if (inviteError) throw inviteError

    // 3. Build shareable links
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const links = invites!.map((inv: { email: string; token: string }) => ({
      email: inv.email,
      url: `${appUrl}/brief/${session.id}?token=${inv.token}`,
    }))

    return NextResponse.json({ session, links })

  } catch (err) {
    console.error('[/api/sessions]', err)
    return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = createServerClient()
    const { data: sessions, error } = await db
      .from('sessions')
      .select(`
        *,
        respondents(count),
        diffs(generated_at)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ sessions })

  } catch (err) {
    console.error('[/api/sessions GET]', err)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}
