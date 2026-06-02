export interface SectionField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'chips'
  placeholder?: string
  rows?: number
  options?: string[]
}

export interface Section {
  id: string
  title: string
  why: string
  fields: SectionField[]
}

export const SECTIONS: Section[] = [
  {
    id: 'audience',
    title: 'Audience & market',
    why: 'UAE and US audiences differ in motivations, references, and price sensitivity. Capturing this early prevents late-stage pivots.',
    fields: [
      { id: 'primaryAudience', label: 'Who is the primary audience for this layer?', type: 'textarea', rows: 2, placeholder: 'e.g. Health-conscious UAE families, dual income, 28–45, urban Dubai/Abu Dhabi' },
      { id: 'painPoints', label: 'Key pain points or motivations', type: 'textarea', rows: 2, placeholder: 'e.g. Distrust of tap water, concern about plastic waste, convenience-first lifestyle' },
      { id: 'audienceRefs', label: 'Reference behaviours or brands they trust', type: 'text', placeholder: 'e.g. Dyson, Fitbit, Careem — premium but practical' },
    ]
  },
  {
    id: 'success',
    title: 'Success metrics',
    why: 'Surface alignment and misalignment early. This becomes the KPI tree locked at sign-off.',
    fields: [
      { id: 'launchKpi', label: 'Launch KPI — what does success look like at go-live?', type: 'text', placeholder: 'e.g. 500 subscribers in first 30 days, <3s LCP on mobile' },
      { id: 'ninetyDayKpi', label: '90-day KPI', type: 'text', placeholder: 'e.g. 3% homepage → checkout CVR, AED 200k MRR' },
      { id: 'metricOwner', label: 'Who owns measuring this?', type: 'text', placeholder: 'e.g. Growth team, Aadam (CTO)' },
    ]
  },
  {
    id: 'constraints',
    title: 'Constraints',
    why: 'Filter ideas against hard limits early. Avoid late-stage surprises.',
    fields: [
      { id: 'techConstraints', label: 'Tech or platform constraints', type: 'text', placeholder: 'e.g. Must run on Webflow, Zoho Inventory integration required' },
      { id: 'budgetTimeline', label: 'Budget or timeline limits', type: 'text', placeholder: 'e.g. Launch by Q3, design budget capped at AED 80k' },
      { id: 'regulatory', label: 'Regulatory or content constraints', type: 'text', placeholder: 'e.g. Arabic RTL required, UAE consumer protection compliance' },
      { id: 'hardNos', label: 'Hard nos — what must not appear?', type: 'textarea', rows: 2, placeholder: 'e.g. No medical claims, no competitor mentions, no stock photography' },
    ]
  },
  {
    id: 'purpose',
    title: 'Purpose',
    why: 'If a layer cannot be given a single-sentence purpose, it does not earn its place in the sitemap.',
    fields: [
      { id: 'layerPurpose', label: 'In one sentence — what does this layer do for the user and the business?', type: 'textarea', rows: 2, placeholder: 'e.g. The homepage converts high-intent paid traffic into subscription trials by making the value proposition immediate and the first step frictionless.' },
      { id: 'successState', label: 'What does a successful user exit from this layer look like?', type: 'text', placeholder: 'e.g. User adds a product to cart or starts a subscription flow' },
    ]
  },
  {
    id: 'narrative',
    title: 'Narrative (user journey)',
    why: 'Anchors layer decisions to real user paths. Ties placements back to audience and metrics.',
    fields: [
      { id: 'entryPoints', label: 'How does the user arrive at this layer?', type: 'chips', options: ['Paid social ad', 'Organic search', 'Direct / brand recall', 'Referral link', 'Email campaign', 'Word of mouth'] },
      { id: 'journeyMap', label: 'Map the journey through this layer — arrival to next step', type: 'textarea', rows: 3, placeholder: 'e.g. User lands on homepage → scans hero → reads social proof → clicks product CTA → reaches PDP → adds to cart' },
      { id: 'dropRisk', label: 'Where is the highest drop-off risk and why?', type: 'textarea', rows: 2, placeholder: 'e.g. Between hero and first scroll — if value prop is unclear, user bounces before seeing product detail' },
    ]
  },
  {
    id: 'components',
    title: 'Components',
    why: 'Inventory before placement. We need the building blocks before laying them out.',
    fields: [
      { id: 'mustHave', label: 'Must-have components', type: 'chips', options: ['Hero', 'Nav', 'Product cards', 'Comparison table', 'Testimonials / reviews', 'Trust badges', 'Pricing block', 'FAQ', 'Video', 'Subscription CTA', 'Footer'] },
      { id: 'niceToHave', label: 'Nice-to-have components (describe)', type: 'textarea', rows: 2, placeholder: 'e.g. Interactive filter demo, water quality map, live chat widget' },
      { id: 'remove', label: 'What should be removed or deprioritised from the current site?', type: 'text', placeholder: 'e.g. Blog carousel above fold, generic banner ads' },
    ]
  },
  {
    id: 'placement',
    title: 'Placement & rationale',
    why: 'Same component on a different page serves a different intent. Rationale earns the call.',
    fields: [
      { id: 'aboveFold', label: 'What must appear above the fold and why?', type: 'textarea', rows: 2, placeholder: 'e.g. Headline + product visual + primary CTA — because paid traffic users make a 3-second judgment' },
      { id: 'scrollOrder', label: 'Proposed scroll order with one-line rationale per section', type: 'textarea', rows: 5, placeholder: '1. Hero — immediate value prop\n2. Social proof — reduce skepticism early\n3. Product trio — show range\n4. How it works — educate before pricing\n5. Pricing — only after trust is established' },
      { id: 'mobileDelta', label: 'Any placement changes for mobile vs desktop?', type: 'text', placeholder: 'e.g. Collapse comparison table to swipeable cards, sticky CTA bar on mobile' },
    ]
  },
  {
    id: 'references',
    title: 'References & open flags',
    why: 'Shared visual language reduces "I imagined something different" rework. Open flags become the workshop agenda.',
    fields: [
      { id: 'refSites', label: '2–3 benchmark sites — what to borrow vs. avoid', type: 'textarea', rows: 4, placeholder: '1. WHOOP — borrow: dark premium feel, product-led hero. Avoid: overly athletic framing.\n2. Dyson — borrow: clean tech credibility. Avoid: complexity.\n3. Aqua Carpatica — borrow: pure/natural palette. Avoid: pricing disconnect.' },
      { id: 'openFlags', label: 'Open flags — anything unresolved, blocked, or uncertain', type: 'textarea', rows: 3, placeholder: 'e.g. No final decision on subscription pricing tiers. Photography brief not started.' },
    ]
  },
]
