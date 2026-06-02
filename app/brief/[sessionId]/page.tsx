'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import type { Answers, Layer, Concept, Session } from '@/types'
import { SECTIONS } from '@/lib/sections'
import styles from './brief.module.css'

type Step = 'identity' | 'sections' | 'generating' | 'done'

const EMPTY_ANSWERS: Answers = {
  primaryAudience: '', painPoints: '', audienceRefs: '',
  launchKpi: '', ninetyDayKpi: '', metricOwner: '',
  techConstraints: '', budgetTimeline: '', regulatory: '', hardNos: '',
  layerPurpose: '', successState: '',
  entryPoints: [], journeyMap: '', dropRisk: '',
  mustHave: [], niceToHave: '', remove: '',
  aboveFold: '', scrollOrder: '', mobileDelta: '',
  refSites: '', openFlags: '',
}

export default function BriefPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  const token = searchParams.get('token') ?? ''

  const [session, setSession] = useState<Session | null>(null)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [step, setStep] = useState<Step>('identity')
  const [sectionIdx, setSectionIdx] = useState(0)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [layer, setLayer] = useState<Layer | ''>('')
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS)
  const [concept, setConcept] = useState<Concept | null>(null)
  const [genStatus, setGenStatus] = useState('Generating your concept...')
  const [respondentId, setRespondentId] = useState<string | null>(null)

  // Validate token on mount
  useEffect(() => {
    async function validate() {
      const res = await fetch(`/api/sessions/${sessionId}/validate-token?token=${token}`)
      const data = await res.json()
      setTokenValid(data.valid)
      if (data.session) setSession(data.session)
    }
    if (sessionId && token) validate()
  }, [sessionId, token])

  function updateAnswer<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  function toggleChip(key: 'entryPoints' | 'mustHave', value: string) {
    setAnswers(prev => {
      const arr = prev[key] as string[]
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
      }
    })
  }

  async function submitQuestionnaire() {
    setStep('generating')
    try {
      // 1. Save respondent to DB
      setGenStatus('Saving your responses...')
      const saveRes = await fetch(`/api/sessions/${sessionId}/respondents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, layer, answers, token }),
      })
      const { respondentId: rid } = await saveRes.json()
      setRespondentId(rid)

      // 2. Generate concept
      setGenStatus('Claude is generating your concept...')
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respondentId: rid, sessionId, answers, name, role, layer }),
      })
      const { concept: c } = await genRes.json()
      setConcept(c)

      // 3. Trigger diff if session is ready
      setGenStatus('Checking for new tensions...')
      await fetch('/api/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {}) // Non-blocking — diff will run when ready

      setStep('done')
    } catch (err) {
      console.error(err)
      setGenStatus('Something went wrong. Please try again.')
    }
  }

  // ─── Guards ─────────────────────────────────────────────────────────────────
  if (tokenValid === null) return <div className={styles.loading}>Validating your link...</div>
  if (!tokenValid)         return <div className={styles.error}>This link is invalid or has expired.</div>

  // ─── Identity ───────────────────────────────────────────────────────────────
  if (step === 'identity') return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>UX Brief</span>
        <span className={styles.project}>{session?.projectName}</span>
      </header>
      <main className={styles.main}>
        <p className={styles.eyebrow}>Step 1 of {SECTIONS.length + 1}</p>
        <h1 className={styles.title}>Who are you?</h1>
        <p className={styles.subtitle}>
          Every contributor fills the same template. Your role gives context to the diff — it doesn't change the questions.
        </p>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>Full name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ebrahim Al Hashimi" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Role</span>
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Brand Lead, CTO, UX Designer" />
          </label>
        </div>
        <label className={styles.field} style={{ marginBottom: '2rem' }}>
          <span className={styles.label}>Layer</span>
          <select value={layer} onChange={e => setLayer(e.target.value as Layer)}>
            <option value="">— select —</option>
            <option>Layer 1 · Brand + SEO</option>
            <option>Layer 2 · UX + Performance</option>
            <option>Layer 3 · UX + Performance + Tech</option>
            <option>Discovery · All contributors</option>
          </select>
        </label>
        <div className={styles.nav}>
          <button
            className="btn btn-primary"
            disabled={!name || !role || !layer}
            onClick={() => setStep('sections')}
          >
            Begin questionnaire →
          </button>
        </div>
      </main>
    </div>
  )

  // ─── Sections ───────────────────────────────────────────────────────────────
  if (step === 'sections') {
    const sec = SECTIONS[sectionIdx]
    const progress = ((sectionIdx + 2) / (SECTIONS.length + 2)) * 100

    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <span className={styles.logo}>UX Brief</span>
          <div className={styles.progressWrap}>
            <div className="progress-track" style={{ width: 160 }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.stepLabel}>{sectionIdx + 2} of {SECTIONS.length + 1}</span>
          </div>
        </header>
        <main className={styles.main}>
          <p className={styles.eyebrow}>Section {sectionIdx + 1} of {SECTIONS.length}</p>
          <h1 className={styles.title}>{sec.title}</h1>
          <p className={styles.subtitle}>{sec.why}</p>

          {sec.fields.map(f => (
            <div key={f.id} className={styles.field}>
              <span className={styles.label}>{f.label}</span>
              {f.type === 'text' && (
                <input
                  value={(answers as any)[f.id] ?? ''}
                  onChange={e => updateAnswer(f.id as keyof Answers, e.target.value as any)}
                  placeholder={f.placeholder}
                />
              )}
              {f.type === 'textarea' && (
                <textarea
                  rows={f.rows ?? 3}
                  value={(answers as any)[f.id] ?? ''}
                  onChange={e => updateAnswer(f.id as keyof Answers, e.target.value as any)}
                  placeholder={f.placeholder}
                />
              )}
              {f.type === 'chips' && (
                <div className={styles.chips}>
                  {f.options!.map(o => (
                    <button
                      key={o}
                      className={`chip ${((answers as any)[f.id] as string[]).includes(o) ? 'selected' : ''}`}
                      onClick={() => toggleChip(f.id as 'entryPoints' | 'mustHave', o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className={styles.nav}>
            <button className="btn btn-ghost" onClick={() => sectionIdx === 0 ? setStep('identity') : setSectionIdx(i => i - 1)}>
              ← Back
            </button>
            <button
              className="btn btn-primary"
              onClick={() => sectionIdx === SECTIONS.length - 1 ? submitQuestionnaire() : setSectionIdx(i => i + 1)}
            >
              {sectionIdx === SECTIONS.length - 1 ? 'Generate concept →' : 'Continue →'}
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ─── Generating ─────────────────────────────────────────────────────────────
  if (step === 'generating') return (
    <div className={styles.page}>
      <main className={styles.genScreen}>
        <div className={styles.orbs}>
          <div className={styles.orb} />
          <div className={styles.orb} />
          <div className={styles.orb} />
        </div>
        <p className={styles.genStatus}>{genStatus}</p>
      </main>
    </div>
  )

  // ─── Done ────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.doneCheck}>✓</div>
        <h1 className={styles.title}>Concept generated</h1>
        <p className={styles.subtitle}>
          Your inputs have been saved and your concept is in the diff. The facilitator will share the workshop view once all responses are collected.
        </p>
        {concept && (
          <div className={styles.conceptPreview}>
            <p className={styles.eyebrow}>Your concept · Hero</p>
            <h2 className="serif" style={{ fontSize: 22, marginBottom: 8 }}>{concept.hero.headline}</h2>
            <p className="muted">{concept.hero.sub}</p>
            <p style={{ marginTop: 16, fontSize: 12 }} className="hint">
              Aesthetic: {concept.visualSystem.aesthetic} · CTA: {concept.hero.cta}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
