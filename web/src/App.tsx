import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'

/**
 * Routes. Home is eager (first paint matters most); the content pages
 * lazy-load so the test itself downloads as little as possible.
 */
import { HomePage } from './pages/HomePage'

const GuidePage = lazy(() =>
  import('./pages/GuidePage').then((m) => ({ default: m.GuidePage })),
)
const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })),
)

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-4xl font-bold text-white">Lost your rhythm?</h1>
      <p className="mt-3 text-slate-400">That page does not exist — but the test does.</p>
      <a href="/" className="btn-neon mt-6">
        Back to the test
      </a>
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense
          fallback={
            <p className="mx-auto w-full max-w-6xl px-4 py-24 text-center text-slate-400 sm:px-6">
              Loading…
            </p>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}
