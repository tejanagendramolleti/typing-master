import { Link, NavLink } from 'react-router-dom'

/** Futuristic shell: ambient background, glass header, SEO-friendly footer. */
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-void-950">
      {/* Ambient background: two drifting orbs + a grid. Pure CSS, GPU-cheap. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 top-[-8rem] h-[28rem] w-[28rem] animate-drift rounded-full bg-pulse-600/25 blur-[120px]" />
        <div className="absolute -right-32 top-[30%] h-[24rem] w-[24rem] animate-drift rounded-full bg-neon-500/15 blur-[120px] [animation-delay:-7s]" />
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.25) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%, black 30%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 90% 60% at 50% 0%, black 30%, transparent 75%)',
          }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-void-950/70 backdrop-blur-xl">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
        >
          <Link to="/" className="flex items-center gap-2.5" aria-label="Typing Test home">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon-400 to-pulse-500 font-mono text-lg font-bold text-void-950 shadow-glow"
            >
              T
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Typing<span className="gradient-text">Test</span>
            </span>
          </Link>
          <div className="flex items-center gap-1 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 font-medium transition-colors ${isActive ? 'text-white' : 'text-slate-400 hover:text-white'}`
              }
            >
              Test
            </NavLink>
            <NavLink
              to="/guide"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 font-medium transition-colors ${isActive ? 'text-white' : 'text-slate-400 hover:text-white'}`
              }
            >
              Guide
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 font-medium transition-colors ${isActive ? 'text-white' : 'text-slate-400 hover:text-white'}`
              }
            >
              About
            </NavLink>
          </div>
        </nav>
      </header>

      <main className="relative z-10">{children}</main>

      <footer className="relative z-10 mt-20 border-t border-white/10">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="font-display text-base font-bold text-white">
              Typing<span className="gradient-text">Test</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Free online typing speed tests. Measure your WPM and accuracy in 1, 2 or 3
              minutes — no sign-up, everything runs in your browser.
            </p>
          </div>
          <nav aria-label="Tests">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tests
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>
                <Link className="hover:text-white" to="/?duration=60">
                  1 minute typing test
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" to="/?duration=120">
                  2 minute typing test
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" to="/?duration=180">
                  3 minute typing test
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Learn">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Learn
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>
                <Link className="hover:text-white" to="/guide">
                  How to type faster
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" to="/about">
                  About &amp; privacy
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-white/5">
          <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-slate-500 sm:px-6">
            © {new Date().getFullYear()} Typing Test. Your scores never leave your device.
          </p>
        </div>
      </footer>
    </div>
  )
}
