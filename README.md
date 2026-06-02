# UX Brief

Stakeholder-driven design brief generator. Every contributor fills the same template → Claude generates a concept per person → a diff surfaces tensions → everything exports to Figma.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | API routes + React, one repo |
| Hosting | Vercel | Zero-config Next.js deploy |
| Database | Supabase (Postgres) | Persistent storage + auth + realtime |
| AI | Anthropic Claude Sonnet | Concept generation + diff |
| Design export | Figma REST API | One page per respondent + synthesis |

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd ux-brief
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → New query
3. Paste and run the contents of `supabase/schema.sql`
4. Copy your project URL and keys from Settings → API

### 3. Figma

1. Go to Figma → Account Settings → Personal access tokens → Generate
2. Create or open a Figma file. Copy the file key from the URL:
   `https://figma.com/file/FILE_KEY_HERE/...`

### 4. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values:

```env
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FIGMA_ACCESS_TOKEN=figd_...
FIGMA_FILE_KEY=your-figma-file-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin)

---

## How it works

### Admin flow (`/admin`)

1. Create a session — give it a project name and paste stakeholder emails
2. The app generates a unique magic link per email (no passwords)
3. Share each link with the relevant person
4. Monitor response count in the sessions list
5. Once ≥2 responses are in, click **Run diff** then **Export to Figma**

### Respondent flow (`/brief/[sessionId]?token=...`)

1. Open their unique link
2. Fill in identity (name, role, layer)
3. Complete 8 sections of the questionnaire
4. Claude generates their concept server-side
5. Done — they see a preview of their concept's hero

### Concept generation (`/api/generate`)

- Called server-side after each respondent submits
- Anthropic API key never touches the browser
- Structured JSON output: hero, scroll structure, visual system, conversion logic, open tensions
- Stored in Supabase `concepts` table

### Diff generation (`/api/diff`)

- Runs automatically when `min_respondents_for_diff` is reached
- Re-runs each time a new concept is added (latest overwrites previous)
- Outputs: aligned points, named tensions, workshop priority decisions
- Stored in `diffs` table (one row per session, upserted)

### Figma export (`/api/figma-export`)

- Creates one Figma page per respondent, named `Name · Role`
- Each page contains annotated frames: Hero, Scroll structure, Visual system, Conversion logic
- Creates a final `⚡ Synthesis` page with tensions in red, alignments in green
- Stores Figma node IDs back on concept rows for deep-linking

---

## Project structure

```
app/
  api/
    generate/         → POST: generate concept (Claude)
    diff/             → POST: generate diff (Claude)
    figma-export/     → POST: export to Figma
    sessions/         → POST: create session | GET: list sessions
  admin/              → Admin dashboard
  brief/[sessionId]/  → Stakeholder questionnaire (token-gated)
  dashboard/[id]/     → Diff view (build this next)

lib/
  prompts.ts          → All Claude prompt builders + JSON parsers
  sections.ts         → Single source of truth for questionnaire sections
  supabase-browser.ts → Client-side Supabase (anon key)
  supabase-server.ts  → Server-side Supabase (service role)

types/
  index.ts            → All shared TypeScript types

supabase/
  schema.sql          → Full DB schema — run this first
```

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set all environment variables in Vercel dashboard:
Project → Settings → Environment Variables

Change `NEXT_PUBLIC_APP_URL` to your production URL before deploying.

---

## What to build next

- `/dashboard/[sessionId]` — realtime diff view using Supabase's realtime subscriptions
- `/api/sessions/[id]/validate-token` — token validation endpoint (required by brief page)
- `/api/sessions/[id]/respondents` — save respondent to DB (required by brief page)
- Email delivery via Resend — send magic links automatically on session creation
- Figma plugin — richer layout generation beyond annotated text frames
