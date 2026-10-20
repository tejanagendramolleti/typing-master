import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** A card with a title. */
export function Card({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title?: string
  description?: string
  action?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={`surface-card p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-title">{title}</h2>}
            {description && <p className="text-muted mt-1">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/** A number with a label under it. */
export function Metric({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'good' | 'warn' | 'bad'
}) {
  const toneClass = {
    default: 'text-ink-900 dark:text-ink-50',
    good: 'text-state-good',
    warn: 'text-state-warn',
    bad: 'text-state-bad',
  }[tone]

  return (
    <div className="metric">
      <span className={`metric-value ${toneClass}`}>{value}</span>
      <span className="metric-label">{label}</span>
      {hint && <span className="text-xs text-ink-400 dark:text-ink-500">{hint}</span>}
    </div>
  )
}

/** A pill. */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'bad'
}) {
  const toneClass = {
    neutral: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
    accent: 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300',
    good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    warn: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    bad: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  }[tone]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  )
}

/** A banner. */
export function Banner({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: 'info' | 'good' | 'warn' | 'bad'
  title?: string
  children: ReactNode
  action?: ReactNode
}) {
  const toneClass = {
    info: 'border-accent-200 bg-accent-50 dark:border-accent-900 dark:bg-accent-950/40',
    good: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40',
    warn: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
    bad: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40',
  }[tone]

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`} role={tone === 'bad' ? 'alert' : 'status'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {title && <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">{title}</p>}
          <div className="text-sm text-ink-700 dark:text-ink-300">{children}</div>
        </div>
        {action}
      </div>
    </div>
  )
}

/** The empty state. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 px-6 py-14 text-center dark:border-ink-700">
      <p className="text-title">{title}</p>
      {description && <p className="text-muted mt-2 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** The loading state. */
export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-500 dark:text-ink-400">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-accent-600"
      />
      <span className="text-sm">{label}…</span>
    </div>
  )
}

/** The error state. */
export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
}: {
  title?: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900 dark:bg-red-950/40">
      <p className="text-title text-red-900 dark:text-red-200">{title}</p>
      {message && <p className="text-muted mt-2">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/**
 * The page heading.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-display">{title}</h1>
        {description && <p className="text-body mt-3 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/**
 * A call to action.
 */
export function Cta({
  to,
  href,
  children,
  variant = 'primary',
}: {
  to?: string
  href?: string
  children: ReactNode
  variant?: 'primary' | 'secondary'
}) {
  const className = variant === 'primary' ? 'btn-primary btn-lg' : 'btn-secondary btn-lg'
  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to ?? '/'} className={className}>
      {children}
    </Link>
  )
}
