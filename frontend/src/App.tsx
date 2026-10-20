import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoadingState } from './components/ui'
import { AuthProvider } from './lib/auth'
import { useAuth } from './lib/useAuth'

/**
 * The application.
 *
 * The public pages are loaded eagerly, because they are the first thing a
 * visitor sees and a slow first paint is the worst first impression. The
 * test screen, the analytics and the admin panel are loaded on demand,
 * because most visitors never open them.
 */
const LandingPage = lazy(() => import('./features/landing/LandingPage'))
const ExamsPage = lazy(() => import('./features/exams/ExamsPage'))
const ExamDetailPage = lazy(() => import('./features/exams/ExamDetailPage'))
const PricingPage = lazy(() => import('./features/pricing/PricingPage'))
const FaqPage = lazy(() => import('./features/faq/FaqPage'))
const SignInPage = lazy(() => import('./features/auth/SignInPage'))
const SignUpPage = lazy(() => import('./features/auth/SignUpPage'))
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'))
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'))
const TestPage = lazy(() => import('./features/test/TestPage'))
const ResultPage = lazy(() => import('./features/result/ResultPage'))
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'))
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'))
const CertificateVerifyPage = lazy(() => import('./features/certificates/CertificateVerifyPage'))
const AdminPage = lazy(() => import('./features/admin/AdminPage'))
const NotFoundPage = lazy(() => import('./features/NotFoundPage'))

/**
 * Sends a visitor who is not signed in to the sign-in page, remembering
 * where they were going.
 */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingState label="Checking your session" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

/**
 * Sends a visitor who is not an administrator to the home page.
 */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingState label="Checking your session" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/** The routes. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/exams" element={<ExamsPage />} />
      <Route path="/exams/:code" element={<ExamDetailPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/certificates/verify" element={<CertificateVerifyPage />} />

      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/test/:attemptId"
        element={
          <RequireAuth>
            <TestPage />
          </RequireAuth>
        }
      />
      <Route
        path="/result/:attemptId"
        element={
          <RequireAuth>
            <ResultPage />
          </RequireAuth>
        }
      />
      <Route
        path="/analytics"
        element={
          <RequireAuth>
            <AnalyticsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminPage />
          </RequireAdmin>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

/**
 * The application root.
 */
export function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingState label="Loading" />}>
        <Layout>
          <AppRoutes />
        </Layout>
      </Suspense>
    </AuthProvider>
  )
}
