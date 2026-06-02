import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import type { Concept, DiffItem } from '@/types'
import styles from './dashboard.module.css'

// Admin view of a session: concepts per respondent + the synthesis diff.
export const dynamic = 'force-dynamic'

const statusLabel: Record<string, string> = {
  collecting: 'Collecting',
  ready_to_diff: 'Ready to diff',
  diffed: 'Diffed',
  exported_to_figma: 'In Figma',
}

const diffMeta: Record<DiffItem['type'], { label: string; badge: string }> = {
  aligned: { label: 'Aligned', badge: 'badge-aligned' },
  tension: { label: 'Tension', badge: 'badge-tension' },
  priority: { label: 'Workshop priority', badge: 'badge-priority' },
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const db = createServerClient()

  const { data: session } = await db
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) notFound()

  const { data: respondents } = await db
    .from('respondents')
    .select('id, name, role, layer, submitted_at, concepts(concept_json)')
    .eq('session_id', sessionId)
    .order('submitted_at', { ascending: true })

  const { data: diff } = await db
    .from('diffs')
    .select('items, generated_at')
    .eq('session_id', sessionId)
    .maybeSingle()

  const people = respondents ?? []
  const items: DiffItem[] = (diff?.items as DiffItem[]) ?? []

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/admin" className={styles.back}>← Admin</Link>
        <span className={styles.mono}>Dashboard</span>
      </header>

      <main className={styles.main}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{session.project_name}</h1>
          <span
            className={`badge badge-${
              session.status === 'exported_to_figma'
                ? 'aligned'
                : session.status === 'diffed'
                ? 'priority'
                : 'tension'
            }`}
          >
            {statusLabel[session.status] ?? session.status}
          </span>
        </div>
        <p className="hint" style={{ marginBottom: 32 }}>
          Created by {session.created_by} · {people.length} response{people.length === 1 ? '' : 's'}
        </p>

        {/* Synthesis diff */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Synthesis</h2>
          {items.length === 0 ? (
            <p className="hint">
              No diff yet. It generates automatically once at least two concepts are in
              {typeof session.min_respondents_for_diff === 'number'
                ? ` (needs ${session.min_respondents_for_diff}).`
                : '.'}
            </p>
          ) : (
            <div className={styles.diffList}>
              {items.map((item, i) => {
                const meta = diffMeta[item.type] ?? { label: item.type, badge: 'badge-priority' }
                return (
                  <div key={i} className={styles.diffItem}>
                    <span className={`badge ${meta.badge}`}>{meta.label}</span>
                    <p className={styles.diffText}>{item.text}</p>
                    {item.respondents && item.respondents.length > 0 && (
                      <p className="hint">{item.respondents.join(', ')}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Concepts per respondent */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Concepts ({people.length})</h2>
          {people.length === 0 && <p className="hint">No responses collected yet.</p>}
          <div className={styles.conceptGrid}>
            {people.map((r: any) => {
              const concept = r.concepts?.[0]?.concept_json as Concept | undefined
              return (
                <div key={r.id} className={styles.conceptCard}>
                  <div className={styles.conceptHead}>
                    <span className={styles.personName}>{r.name}</span>
                    <span className="hint">{r.role}</span>
                  </div>
                  <span className={styles.layer}>{r.layer}</span>
                  {concept ? (
                    <div className={styles.conceptBody}>
                      <h3 className="serif" style={{ fontSize: 18, margin: '12px 0 6px' }}>
                        {concept.hero.headline}
                      </h3>
                      <p className="muted" style={{ fontSize: 13 }}>{concept.hero.sub}</p>
                      <p className="hint" style={{ marginTop: 10 }}>
                        Aesthetic: {concept.visualSystem.aesthetic} · CTA: {concept.hero.cta}
                      </p>
                    </div>
                  ) : (
                    <p className="hint" style={{ marginTop: 12 }}>Concept pending…</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
