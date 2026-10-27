/**
 * Test content. Everything ships in the bundle — no backend, no fetch.
 * Each scenario holds several passages; long durations loop through them.
 */

export type ScenarioId = 'everyday' | 'exam' | 'code' | 'punct' | 'quotes'

export interface Scenario {
  id: ScenarioId
  name: string
  blurb: string
}

export const SCENARIOS: Scenario[] = [
  { id: 'everyday', name: 'Everyday', blurb: 'Common words, natural rhythm' },
  { id: 'exam', name: 'Exam', blurb: 'Formal paragraphs, exam style' },
  { id: 'code', name: 'Code', blurb: 'Symbols and camelCase for devs' },
  { id: 'punct', name: 'Punctuation+', blurb: 'Numbers, caps and tricky marks' },
  { id: 'quotes', name: 'Quotes', blurb: 'Short bursts of wisdom' },
]

export const DURATIONS = [
  { seconds: 30, label: '30s' },
  { seconds: 60, label: '1 min' },
  { seconds: 120, label: '2 min' },
  { seconds: 180, label: '3 min' },
  { seconds: 300, label: '5 min' },
] as const

const PASSAGES: Record<ScenarioId, string[]> = {
  everyday: [
    'The morning light falls across the kitchen table while the kettle hums softly in the corner. I check the time, grab my bag, and step out into the cool air. Birds argue in the trees overhead, and somewhere down the street a bus sighs to a stop.',
    'We walked along the river until the path turned to gravel and the city noise faded behind us. She told a story about her grandfather who built boats by hand, and the hours slipped past without either of us noticing.',
    'Cooking is mostly patience. Chop the onions fine, let them soften slowly, and resist the urge to rush the sauce. Dinner tastes better when the whole house smells like it long before the plates arrive.',
    'The market was crowded with colour: pyramids of oranges, bunches of fresh herbs, and a baker stacking warm loaves by the door. I bought more than I planned and carried it all home with both arms full.',
  ],
  exam: [
    'Education is the foundation upon which the progress of any nation rests. It equips individuals with knowledge, discipline and the ability to think critically. A society that invests in learning invests in its own future prosperity and stability.',
    'The rapid growth of technology has transformed the way people communicate, work and learn. While these changes bring remarkable convenience, they also demand adaptability and a commitment to lifelong learning from every citizen.',
    'Environmental protection requires collective effort and sustained awareness. Conserving water, reducing waste and planting trees are small actions that, when practised by millions, create a measurable and lasting impact.',
    'Effective time management distinguishes successful candidates in competitive examinations. A planned schedule, regular revision and consistent practice build both confidence and accuracy under the pressure of the clock.',
  ],
  code: [
    'const results = items.filter((item) => item.score > threshold); const total = results.reduce((sum, r) => sum + r.value, 0); return { count: results.length, total };',
    'function debounce(fn, delay = 300) { let timer = null; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; }',
    'if (user && user.isActive && !user.isBanned) { await session.start(user.id); logger.info(`session started: ${user.id}`); } else { throw new Error("access denied"); }',
    'for (let i = 0; i < nodes.length; i++) { const node = nodes[i]; if (node.children) queue.push(...node.children); visited.add(node.id); }',
  ],
  punct: [
    'Wait — did you see that? The total was $47.99 (plus 8% tax), due by 5:30 p.m. on Friday, March 14th! Call +1 (555) 013-2048 if anything looks off.',
    'Chapter 3: "The Quick Brown Fox" — pp. 112-148. Q: Which 7 figures earned >$1M in Q2? A: Only #4 & #9; the rest fell 12.5% short of target.',
    'Email me at hello@example.com by 12:00 noon; attach files A, B & C (max. 25MB each). Use subject: RE: Project X — Phase 2/3 approval needed ASAP!',
    'In 1969, Apollo 11 landed at 20:17 UTC; Armstrong stepped out at 02:56. Cost: ~$25.4 billion — i.e., 2.2% of U.S. spending in 1966. Wow!',
  ],
  quotes: [
    'The expert in anything was once a beginner who refused to give up. Slow progress is still progress, and every paragraph you finish makes the next one easier.',
    'We are what we repeatedly do. Excellence, then, is not an act but a habit. Type one more line, then one more, and watch the habit build itself.',
    'Do not wait for the perfect moment. Take the moment and make it perfect. The clock is already running, and your fingers already know the way.',
    'Success is the sum of small efforts repeated day in and day out. Accuracy first, speed second, and patience always.',
  ],
}

/** Fisher–Yates shuffle — a fresh copy, the source order never changes. */
function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Builds a reference text long enough for the chosen duration.
 * Assumes ~70 WPM (350 chars/min) plus headroom so fast typists never run dry.
 *
 * The passages are shuffled and started at a random offset on every call,
 * so two tests with the same scenario almost never read the same.
 */
export function buildText(scenario: ScenarioId, durationSeconds: number): string {
  const needed = Math.ceil((durationSeconds / 60) * 350 * 1.6)
  const parts = shuffled(PASSAGES[scenario])
  const startAt = Math.floor(Math.random() * parts.length)
  let text = ''
  let i = 0
  while (text.length < needed) {
    text += (text ? ' ' : '') + parts[(startAt + i) % parts.length]
    i += 1
  }
  return text
}
