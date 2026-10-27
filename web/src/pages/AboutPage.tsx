/**
 * About page: what the app is, privacy posture (important for AdSense
 * approval later), and contact placeholder.
 */
export function AboutPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-300">About</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
        A typing test that respects you
      </h1>
      <div className="mt-6 space-y-5 leading-relaxed text-slate-400">
        <p>
          <strong className="text-white">Typing Test</strong> is a free online typing
          speed test. Choose 30 seconds, 1, 2, 3 or 5 minutes, pick a scenario from
          everyday prose to code, and get your words-per-minute and accuracy instantly.
        </p>
        <section className="panel p-6">
          <h2 className="font-display text-lg font-bold text-white">Privacy</h2>
          <p className="mt-2 text-sm">
            Everything runs in your browser. There is no account, no server and no
            tracking in v1 — your best score and recent runs live in your own
            device&apos;s local storage, and you can clear them any time by clearing
            site data. When ads arrive in v2, this page will name the ad provider and
            link its privacy controls.
          </p>
        </section>
        <section className="panel p-6">
          <h2 className="font-display text-lg font-bold text-white">How scores work</h2>
          <p className="mt-2 text-sm">
            Gross WPM counts everything you typed; net WPM counts only correct
            characters. Accuracy is correct characters divided by total typed. Paste is
            disabled during tests so published scores mean something.
          </p>
        </section>
        <section className="panel p-6">
          <h2 className="font-display text-lg font-bold text-white">Contact</h2>
          <p className="mt-2 text-sm">
            Found a typo in a passage or want a new scenario? Add a contact email here
            before applying for AdSense — review teams look for a reachable owner.
          </p>
        </section>
      </div>
    </article>
  )
}
