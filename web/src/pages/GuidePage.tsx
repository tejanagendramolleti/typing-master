import { Link } from 'react-router-dom'

/**
 * Guide page: long-form SEO content targeting "how to type faster",
 * "increase typing speed" intent. Static, fast, crawlable.
 */
export function GuidePage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-300">Guide</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
        How to type faster: a practical guide
      </h1>
      <p className="mt-4 leading-relaxed text-slate-400">
        Typing speed is a trainable skill, not a talent. Most people plateau around 40
        words per minute because they practise the same way every time. Here is the
        method that actually moves the number — accuracy first, bursts second,
        stamina third.
      </p>

      <div className="mt-10 space-y-8">
        {[
          {
            title: '1. Fix accuracy before chasing speed',
            body: 'Every error costs you twice: the wrong keystroke plus the correction. Slow down until you hold 97%+ accuracy on 1-minute tests, then let speed rise on its own. Our net WPM only counts correct characters, so this is exactly what the score rewards.',
          },
          {
            title: '2. Train in short bursts',
            body: 'Five focused 1-minute tests beat one distracted 5-minute session. Short bursts keep your fingers fresh and your attention sharp. Use the 1-minute mode daily, and test yourself honestly with the 3-minute mode once a week.',
          },
          {
            title: '3. Learn touch typing properly',
            body: 'Keep all eight fingers on the home row (ASDF–JKL;), return to it after every key, and stop looking at the keyboard. It feels slower for two weeks, then your speed jumps past your old peak and keeps climbing.',
          },
          {
            title: '4. Practise the hard stuff on purpose',
            body: 'Punctuation, numbers, capitals and symbols are where speed dies. The Punctuation+ and Code scenarios exist for exactly this — ten minutes there transfers directly to real documents, emails and exams.',
          },
          {
            title: '5. Build stamina with 3-minute runs',
            body: 'Speed without stamina collapses in real tests. A weekly 3-minute run trains consistent rhythm: aim for your last 30 seconds to be as fast as your first 30. When they match, your technique is solid.',
          },
        ].map((s) => (
          <section key={s.title} className="panel p-6">
            <h2 className="font-display text-xl font-bold text-white">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link to="/" className="btn-neon">
          Put it into practice — take the test
        </Link>
      </div>
    </article>
  )
}
