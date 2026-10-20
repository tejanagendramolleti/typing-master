import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../lib/api'
import { useAuth } from '../../lib/useAuth'
import { Banner, Card, PageHeader } from '../../components/ui'

/** The shape of the location state the protected routes set. */
interface LocationState {
  from?: string
}

/**
 * The sign-in page.
 */
export default function SignInPage() {
  const { signIn, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  if (!isLoading && isAuthenticated) {
    return <Navigate to={state?.from ?? '/dashboard'} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setPending(true)
    try {
      await signIn(email.trim(), password)
      navigate(state?.from ?? '/dashboard', { replace: true })
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message)
        setFieldErrors(caught.fieldErrors)
      } else {
        setError('The sign-in failed. Please try again.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <PageHeader
          title="Sign in"
          description="Pick up where you left off. Your saved tests and results are waiting."
        />

        <Card>
          <form onSubmit={handleSubmit} noValidate className="stack">
            {error && (
              <Banner tone="bad" title="That did not work">
                {error}
              </Banner>
            )}

            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-1.5 text-sm text-state-bad">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="password" className="label">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="mb-1.5 text-sm text-accent-700 hover:underline dark:text-accent-400"
                >
                  Forgotten?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              {fieldErrors.password && (
                <p id="password-error" className="mt-1.5 text-sm text-state-bad">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </Card>

        <p className="text-muted mt-6 text-center">
          New here?{' '}
          <Link to="/sign-up" className="font-medium text-accent-700 hover:underline dark:text-accent-400">
            Create a free account
          </Link>
        </p>
      </div>
    </div>
  )
}
