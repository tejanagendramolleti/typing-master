import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../../lib/api'
import { useAuth } from '../../lib/useAuth'
import { Banner, Card, PageHeader } from '../../components/ui'

/**
 * The registration page.
 */
export default function SignUpPage() {
  const { signUp, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'The two passwords do not match.' })
      return
    }

    setPending(true)
    try {
      await signUp(email.trim(), password, displayName.trim())
      navigate('/dashboard', { replace: true })
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message)
        setFieldErrors(caught.fieldErrors)
      } else {
        setError('The registration failed. Please try again.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <PageHeader
          title="Create your account"
          description="Three practice tests a day, free, with no card. You can upgrade later if you want the full mock series."
        />

        <Card>
          <form onSubmit={handleSubmit} noValidate className="stack">
            {error && (
              <Banner tone="bad" title="That did not work">
                {error}
              </Banner>
            )}

            <div>
              <label htmlFor="displayName" className="label">
                Your name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="input"
                aria-invalid={Boolean(fieldErrors.displayName)}
                aria-describedby={fieldErrors.displayName ? 'displayName-error' : undefined}
              />
              {fieldErrors.displayName && (
                <p id="displayName-error" className="mt-1.5 text-sm text-state-bad">
                  {fieldErrors.displayName}
                </p>
              )}
            </div>

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
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby="password-help"
              />
              <p id="password-help" className="text-muted mt-1.5">
                At least eight characters.
              </p>
              {fieldErrors.password && (
                <p className="mt-1.5 text-sm text-state-bad">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm the password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="input"
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? 'confirm-error' : undefined}
              />
              {fieldErrors.confirmPassword && (
                <p id="confirm-error" className="mt-1.5 text-sm text-state-bad">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? 'Creating your account…' : 'Create the account'}
            </button>
          </form>
        </Card>

        <p className="text-muted mt-6 text-center">
          Already have an account?{' '}
          <Link to="/sign-in" className="font-medium text-accent-700 hover:underline dark:text-accent-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
