import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

/** The theme the reader has chosen. */
type Theme = 'light' | 'dark'

/**
 * The theme toggle.
 *
 * The theme is applied to the `html` element as a class, and the choice is
 * kept in local storage. The `index.html` script applies the same choice
 * before the first paint, so there is no flash of the wrong theme.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('examtyper.theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('examtyper.theme', theme)
  }, [theme])

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="btn-ghost btn-sm rounded-lg p-2"
      aria-label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
      title={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
    >
      {theme === 'dark' ? (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-13a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 14a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1ZM3 10a1 1 0 0 1-1 1H1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm16 0a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM4.34 4.34a1 1 0 0 1 1.41 0l.71.71A1 1 0 0 1 5.05 6.46l-.71-.71a1 1 0 0 1 0-1.41Zm9.9 9.9a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1-1.41 1.41l-.71-.71a1 1 0 0 1 0-1.41ZM4.34 15.66a1 1 0 0 1 0 1.41l-.71.71a1 1 0 0 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0Zm9.9-9.9a1 1 0 0 1 0 1.41l-.71.71a1 1 0 1 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0Z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M17.293 13.293A8 8 0 0 1 6.707 2.707a8 8 0 1 0 10.586 10.586Z" />
        </svg>
      )}
    </button>
  )
}

/** The wordmark. */
function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="ExamTyper home">
      <span
        aria-hidden="true"
        className="grid h-8 w-8 place-items-center rounded-lg bg-accent-600 font-mono text-sm font-bold text-white"
      >
        ET
      </span>
      <span className="text-base font-semibold tracking-tight text-ink-900 dark:text-ink-50">
        ExamTyp<span className="text-accent-600 dark:text-accent-400">er</span>
      </span>
    </Link>
  )
}

/** The links shown to a reader who is not signed in. */
const PUBLIC_LINKS = [
  { to: '/exams', label: 'Exams' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/faq', label: 'FAQ' },
]

/** The links shown to a signed-in reader. */
const MEMBER_LINKS = [
  { to: '/exams', label: 'Exams' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/pricing', label: 'Pricing' },
]

/**
 * The site header.
 */
export function Header() {
  const { user, isAuthenticated, isAdmin, signOut } = useAuth()
  const location = useLocation()

  const links = isAuthenticated ? MEMBER_LINKS : PUBLIC_LINKS

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/85 backdrop-blur dark:border-ink-800 dark:bg-surface-dark/85">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Wordmark />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive || location.pathname.startsWith(`${link.to}/`)
                    ? 'bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-ink-50'
                    : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-ink-50'
                    : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100'
                }`
              }
            >
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="hidden text-sm font-medium text-ink-600 sm:block dark:text-ink-300">
                {user?.displayName || user?.email}
              </Link>
              <button type="button" onClick={() => void signOut()} className="btn-secondary btn-sm">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/sign-in" className="btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/sign-up" className="btn-primary btn-sm">
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

/**
 * The site footer.
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-ink-200 py-10 dark:border-ink-800">
      <div className="container-page flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Wordmark />
          <p className="mt-2 max-w-sm text-sm text-ink-500 dark:text-ink-400">
            Typing practice built for the SSC, High Court, RRB, stenographer and DEO
            examinations.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer">
          <Link to="/exams" className="text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100">
            Exams
          </Link>
          <Link to="/pricing" className="text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100">
            Pricing
          </Link>
          <Link to="/faq" className="text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100">
            FAQ
          </Link>
          <Link to="/certificates/verify" className="text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100">
            Verify a certificate
          </Link>
        </nav>
      </div>
      <div className="container-page mt-8 border-t border-ink-200 pt-6 text-xs text-ink-500 dark:border-ink-800 dark:text-ink-400">
        <p>
          The exam rules shown here are defaults for practice. Always check the latest
          official notification before you sit the real examination.
        </p>
      </div>
    </footer>
  )
}

/**
 * The page shell: the header, the content and the footer.
 */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
