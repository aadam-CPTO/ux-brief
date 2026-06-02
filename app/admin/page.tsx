'use client'

import { useState, useEffect } from 'react'
import type { Session } from '@/types'
import styles from './admin.module.css'

export default function AdminPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [creating, setCreating] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [emails, setEmails] = useState('')
  const [links, setLinks] = useState<{ email: string; url: string }[]>([])
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => { loadSessions() }, [])

  async function loadSessions() {
    const res = await fetch('/api/sessions')
    const data = await res.json()
    setSessions(data.sessions ?? [])
  }

  async function createSession() {
    setCreating(true)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName,
        createdBy,
        emails: emails.split('\n').map(e => e.trim()).filter(Boolean),
        minRespondents: 2,
      }),
    })
    const data = await res.json()
    setLinks(data.links ?? [])
    setCreating(false)
    loadSessions()
  }

  async function triggerDiff(sessionId: string) {
    await fetch('/api/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    loadSessions()
  }

  async function triggerFigmaExport(sessionId: string) {
    setExporting(sessionId)
    const res = await fetch('/api/figma-export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    const data = await res.json()
    if (data.result) {
      window.open(`https://figma.com/file/${data.result.fileKey}`, '_blank')
    }
    setExporting(null)
    loadSessions()
  }

  const statusLabel: Record<string, string> = {
    collecting: 'Collecting',
    ready_to_diff: 'Ready to diff',
    diffed: 'Diffed',
    exported_to_figma: 'In Figma',
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>UX Brief</span>
        <span className={styles.mono}>Admin</span>
      </header>

      <main className={styles.main}>
        {/* Create new session */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>New session</h2>
          <div className={styles.grid2}>
            <label className={styles.field}>
              <span className={styles.label}>Project name</span>
              <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Wisewell US Homepage v1" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Created by</span>
              <input value={createdBy} onChange={e => setCreatedBy(e.target.value)} placeholder="e.g. Aadam" />
            </label>
          </div>
          <label className={styles.field}>
            <span className={styles.label}>Stakeholder emails (one per line)</span>
            <textarea rows={4} value={emails} onChange={e => setEmails(e.target.value)} placeholder="ebrahim@wisewell.ae&#10;designer@agency.com&#10;ceo@wisewell.ae" />
          </label>
          <button className="btn btn-primary" onClick={createSession} disabled={creating || !projectName || !createdBy}>
            {creating ? 'Creating...' : 'Create session & generate links'}
          </button>

          {links.length > 0 && (
            <div className={styles.linksPanel}>
              <p className={styles.linksLabel}>Share these links with each stakeholder:</p>
              {links.map(l => (
                <div key={l.email} className={styles.linkRow}>
                  <span className={styles.linkEmail}>{l.email}</span>
                  <input readOnly value={l.url} className={styles.linkInput} onClick={e => (e.target as HTMLInputElement).select()} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sessions list */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Sessions</h2>
          {sessions.length === 0 && <p className="hint">No sessions yet.</p>}
          {sessions.map(s => (
            <div key={s.id} className={styles.sessionCard}>
              <div className={styles.sessionMeta}>
                <span className={styles.sessionName}>{s.projectName}</span>
                <span className={`badge badge-${s.status === 'exported_to_figma' ? 'aligned' : s.status === 'diffed' ? 'priority' : 'tension'}`}>
                  {statusLabel[s.status] ?? s.status}
                </span>
              </div>
              <p className="hint" style={{ marginBottom: 12 }}>
                Created by {s.createdBy} · {s.respondentCount ?? 0} responses · {new Date(s.createdAt).toLocaleDateString()}
              </p>
              <div className={styles.sessionActions}>
                <a className="btn btn-ghost btn-sm" href={`/dashboard/${s.id}`}>View diff</a>
                {s.status === 'ready_to_diff' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => triggerDiff(s.id)}>Run diff</button>
                )}
                {(s.status === 'diffed' || s.status === 'ready_to_diff') && (
                  <button
                    className="btn btn-accent btn-sm"
                    onClick={() => triggerFigmaExport(s.id)}
                    disabled={exporting === s.id}
                  >
                    {exporting === s.id ? 'Exporting...' : 'Export to Figma'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
