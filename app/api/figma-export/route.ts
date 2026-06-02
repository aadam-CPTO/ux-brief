import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import type { FigmaExportRequest, FigmaExportResponse, Concept, DiffItem } from '@/types'

const FIGMA_API = 'https://api.figma.com/v1'
const TOKEN = process.env.FIGMA_ACCESS_TOKEN!
const FILE_KEY = process.env.FIGMA_FILE_KEY!

const figmaHeaders = {
  'X-Figma-Token': TOKEN,
  'Content-Type': 'application/json',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function figmaPost(path: string, body: unknown) {
  const res = await fetch(`${FIGMA_API}${path}`, {
    method: 'POST',
    headers: figmaHeaders,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Figma API error ${res.status}: ${await res.text()}`)
  return res.json()
}

// Creates a text node inside a Figma frame
function textNode(content: string, x: number, y: number, w: number, fontSize = 14, bold = false) {
  return {
    type: 'TEXT',
    name: content.slice(0, 40),
    characters: content,
    absoluteBoundingBox: { x, y, width: w, height: fontSize * 1.4 },
    style: { fontSize, fontWeight: bold ? 700 : 400 },
  }
}

// Builds a labelled section frame from a concept
function buildConceptFrame(name: string, role: string, concept: Concept, pageX = 0) {
  const nodes: ReturnType<typeof textNode>[] = []
  let y = 40

  const add = (text: string, x: number, size = 13, bold = false) => {
    nodes.push(textNode(text, pageX + x, y, 600, size, bold))
    y += size * 1.8
  }

  add(`${name} · ${role}`, 0, 20, true)
  y += 8

  add('HERO', 0, 11, true)
  add(`Headline: ${concept.hero.headline}`, 16, 13)
  add(`Sub: ${concept.hero.sub}`, 16, 13)
  add(`CTA: ${concept.hero.cta}`, 16, 13)
  add(`Visual: ${concept.hero.visual}`, 16, 12)
  y += 8

  add('SCROLL STRUCTURE', 0, 11, true)
  concept.scrollStructure.forEach(s => add(`${s.order}. ${s.section} — ${s.rationale}`, 16, 12))
  y += 8

  add('VISUAL SYSTEM', 0, 11, true)
  add(`Typography: ${concept.visualSystem.typography.primary} / ${concept.visualSystem.typography.accent}`, 16, 12)
  add(`Aesthetic: ${concept.visualSystem.aesthetic}`, 16, 12)
  concept.visualSystem.palette.forEach(p => add(`${p.name} ${p.hex} — ${p.role}`, 16, 12))
  y += 8

  add('CONVERSION LOGIC', 0, 11, true)
  add(`Above fold: ${concept.conversionLogic.aboveFoldPriority}`, 16, 12)
  add(`Trust signals: ${concept.conversionLogic.trustSignals}`, 16, 12)
  add(`Mobile: ${concept.conversionLogic.mobileDelta}`, 16, 12)
  y += 8

  add('OPEN TENSIONS', 0, 11, true)
  concept.openTensions.forEach(t => add(`· ${t}`, 16, 12))

  return { nodes, height: y + 40 }
}

// Builds the synthesis frame from diff items
function buildSynthesisFrame(items: DiffItem[]) {
  const nodes: ReturnType<typeof textNode>[] = []
  let y = 40
  const add = (text: string, x: number, size = 13, bold = false) => {
    nodes.push(textNode(text, x, y, 700, size, bold))
    y += size * 1.8
  }

  add('SYNTHESIS · Tensions & alignments', 0, 20, true)
  y += 16

  const typeLabel: Record<DiffItem['type'], string> = {
    aligned: '✓ ALIGNED',
    tension: '⚡ TENSION',
    priority: '→ WORKSHOP PRIORITY',
  }

  for (const item of items) {
    add(typeLabel[item.type], 0, 11, true)
    add(item.text, 16, 13)
    if (item.respondents?.length) add(`Respondents: ${item.respondents.join(', ')}`, 16, 11)
    y += 8
  }

  return { nodes, height: y + 40 }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { sessionId }: FigmaExportRequest = await req.json()
    const db = createServerClient()

    // 1. Fetch all data
    const [{ data: respondents }, { data: diffRow }] = await Promise.all([
      db.from('respondents')
        .select(`id, name, role, concepts(concept_json)`)
        .eq('session_id', sessionId),
      db.from('diffs')
        .select('items')
        .eq('session_id', sessionId)
        .single(),
    ])

    if (!respondents?.length) throw new Error('No respondents found')

    const pages: FigmaExportResponse['result']['pages'] = []

    // 2. Create one page per respondent
    for (const r of respondents) {
      const concept = r.concepts?.[0]?.concept_json as Concept | undefined
      if (!concept) continue

      const pageName = `${r.name} · ${r.role}`
      const { nodes, height } = buildConceptFrame(r.name, r.role, concept)

      const res = await figmaPost(`/files/${FILE_KEY}/pages`, {
        name: pageName,
        children: [{
          type: 'FRAME',
          name: 'Concept',
          absoluteBoundingBox: { x: 0, y: 0, width: 800, height },
          children: nodes,
        }]
      })

      const nodeId = res?.id ?? ''
      pages.push({ name: pageName, nodeId, respondentId: r.id })

      // Store Figma node ID back on the concept row
      await db.from('concepts')
        .update({ figma_node_id: nodeId })
        .eq('respondent_id', r.id)
    }

    // 3. Create synthesis page
    if (diffRow?.items?.length) {
      const { nodes, height } = buildSynthesisFrame(diffRow.items as DiffItem[])
      const res = await figmaPost(`/files/${FILE_KEY}/pages`, {
        name: '⚡ Synthesis',
        children: [{
          type: 'FRAME',
          name: 'Diff',
          absoluteBoundingBox: { x: 0, y: 0, width: 900, height },
          children: nodes,
        }]
      })
      pages.push({ name: '⚡ Synthesis', nodeId: res?.id ?? '', respondentId: 'synthesis' })
    }

    // 4. Mark session exported
    await db.from('sessions')
      .update({ status: 'exported_to_figma', figma_file_key: FILE_KEY })
      .eq('id', sessionId)

    return NextResponse.json({
      result: { fileKey: FILE_KEY, pages, exportedAt: new Date().toISOString() }
    } satisfies FigmaExportResponse)

  } catch (err) {
    console.error('[/api/figma-export]', err)
    return NextResponse.json({ error: 'Figma export failed' }, { status: 500 })
  }
}
