import type { Answers, Layer, Respondent, Concept, DiffItem } from '@/types'

// ─── Concept generation prompt ───────────────────────────────────────────────

export function buildConceptPrompt(
  name: string,
  role: string,
  layer: Layer,
  answers: Answers
): string {
  return `You are a senior UX strategist generating a structured homepage concept for Wisewell, a premium water filtration brand in the UAE.

Respondent: ${name} · ${role} · ${layer}

Their inputs:
AUDIENCE: ${answers.primaryAudience} | Pain points: ${answers.painPoints} | Refs: ${answers.audienceRefs}
SUCCESS: Launch KPI: ${answers.launchKpi} | 90-day: ${answers.ninetyDayKpi}
CONSTRAINTS: Tech: ${answers.techConstraints} | Timeline/budget: ${answers.budgetTimeline} | Hard nos: ${answers.hardNos}
PURPOSE: ${answers.layerPurpose}
JOURNEY: Entry via: ${answers.entryPoints.join(', ')} | Path: ${answers.journeyMap} | Drop risk: ${answers.dropRisk}
COMPONENTS: Must-have: ${answers.mustHave.join(', ')} | Nice-to-have: ${answers.niceToHave}
PLACEMENT: Above fold: ${answers.aboveFold} | Scroll order: ${answers.scrollOrder}
REFERENCES: ${answers.refSites}

Respond ONLY with valid JSON matching this exact structure. No markdown, no explanation, just JSON:

{
  "hero": {
    "headline": "actual headline copy",
    "sub": "sub-headline copy",
    "layout": "layout description",
    "visual": "specific visual direction",
    "cta": "button label and position"
  },
  "scrollStructure": [
    { "order": 1, "section": "section name", "rationale": "one line rationale" }
  ],
  "visualSystem": {
    "typography": { "primary": "font name and style", "accent": "font name and style" },
    "palette": [
      { "name": "colour name", "hex": "#000000", "role": "what it is used for" }
    ],
    "aesthetic": "2-3 word direction"
  },
  "conversionLogic": {
    "aboveFoldPriority": "what must be visible",
    "trustSignals": "what and where",
    "mobileDelta": "mobile-specific changes"
  },
  "openTensions": [
    "specific unresolved question this concept raises"
  ]
}`
}

// ─── Diff generation prompt ───────────────────────────────────────────────────

export function buildDiffPrompt(respondents: Pick<Respondent, 'name' | 'role' | 'concept'>[]): string {
  const conceptSummaries = respondents
    .filter(r => r.concept)
    .map(r => `${r.name} (${r.role}):\n${r.concept!.rawText}`)
    .join('\n\n---\n\n')

  return `You have ${respondents.length} homepage concepts for Wisewell (UAE water filtration brand) from different stakeholders:

${conceptSummaries}

Respond ONLY with valid JSON. No markdown, no explanation, just JSON:

{
  "items": [
    {
      "type": "aligned",
      "text": "specific point where all/most respondents agree",
      "respondents": ["Name1", "Name2"]
    },
    {
      "type": "tension",
      "text": "specific conflict — name the respondents and describe the conflict precisely",
      "respondents": ["Name1", "Name2"]
    },
    {
      "type": "priority",
      "text": "Decision N: critical design decision framed as a concrete choice",
      "respondents": []
    }
  ]
}

Include 3 aligned items, 3 tension items, and 3 priority items. Be specific — name respondents in tensions.`
}

// ─── Parse Claude's JSON response safely ────────────────────────────────────

// Strips code fences and any prose before/after the JSON object, then parses.
// Tolerant of models that add a sentence around the JSON despite instructions.
function extractJson(raw: string): string {
  let s = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1)
  }
  return s
}

export function parseConceptResponse(raw: string): Concept {
  const parsed = JSON.parse(extractJson(raw))
  return { ...parsed, rawText: raw }
}

export function parseDiffResponse(raw: string): DiffItem[] {
  const parsed = JSON.parse(extractJson(raw))
  return (parsed.items ?? []) as DiffItem[]
}
