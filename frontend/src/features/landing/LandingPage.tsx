import { Link } from 'react-router-dom'
import { Badge, Cta, PageHeader } from '../../components/ui'
import { useAuth } from '../../lib/useAuth'

/** The exams the platform covers. */
const EXAMS = [
  {
    code: 'SSC-CHSL-EN',
    name: 'SSC CHSL',
    detail: 'Combined Higher Secondary Level, English',
    speed: '35 wpm',
  },
  {
    code: 'SSC-CGL-EN',
    name: 'SSC CGL',
    detail: 'Combined Graduate Level, English',
    speed: '30 wpm',
  },
  {
    code: 'COURT-TYPIST-EN',
    name: 'High Court Typist',
    detail: 'Court typist and junior assistant, English',
    speed: '40 wpm',
  },
  {
    code: 'RRB-EN',
    name: 'Railway Typist',
    detail: 'RRB Group D and CEN, English',
    speed: '35 wpm',
  },
  {
    code: 'STENO-EN',
    name: 'Stenographer',
    detail: 'SSC and High Court stenographer, English',
    speed: '40 wpm',
  },
  {
    code: 'DEO-ALNUM',
    name: 'Data Entry Operator',
    detail: 'DEO and DEO Grade A, alphanumeric',
    speed: '40 wpm',
  },
]

/** The three things the product is good at. */
const PILLARS = [
  {
    title: 'Scored on the server',
    body: 'Your speed is recalculated from what you actually typed, against the passage the server holds. A client cannot report a speed it did not earn.',
  },
  {
    title: 'Real keyboard layouts',
    body: 'English, Hindi Inscript, Hindi Kruti Dev and Telugu Inscript, each with an on-screen keyboard that shows you the next key to press.',
  },
  {
    title: 'Analytics that point somewhere',
    body: 'Your weak keys, the words you miss most, and the hours of the day you type fastest. A drill built from the ones you actually get wrong.',
  },
]

/**
 * The landing page.
 */
export default function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div>
      {/* ---- The hero ---- */}
      <section className="border-b border-ink-200 bg-gradient-to-b from-accent-50/60 to-transparent dark:border-ink-800 dark:from-accent-950/30">
        <div className="container-page py-16 sm:py-24">
          <div className="max-w-3xl">
            <Badge tone="accent">Free to start · three tests a day</Badge>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl dark:text-ink-50">
              Typing practice that measures the exam, not the keyboard.
            </h1>
            <p className="text-body mt-5 max-w-2xl text-lg">
              ExamTyper runs full-length typing tests for the SSC, High Court, RRB,
              stenographer and data entry examinations. Passages in English, Hindi and
              Telugu, scored the way the real test is scored.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <Cta to="/exams">Start a test</Cta>
              ) : (
                <>
                  <Cta to="/sign-up">Start free</Cta>
                  <Cta to="/exams" variant="secondary">
                    See the exams
                  </Cta>
                </>
              )}
            </div>
            <p className="text-muted mt-5">
              No card needed for the free tier. No software to install.
            </p>
          </div>
        </div>
      </section>

      {/* ---- The pillars ---- */}
      <section className="container-page py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="surface-card p-6">
              <h2 className="text-title">{pillar.title}</h2>
              <p className="text-body mt-3">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- The exams ---- */}
      <section className="border-y border-ink-200 bg-ink-50/60 py-16 dark:border-ink-800 dark:bg-ink-950/40">
        <div className="container-page">
          <PageHeader
            eyebrow="The catalogue"
            title="Every exam, in every language it is held in"
            description="The rules for each exam — the time, the passing speed, the way mistakes are counted — are data, not hard-coded. They come from the exam profile, so they are the same everywhere in the product."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMS.map((exam) => (
              <Link
                key={exam.code}
                to={`/exams/${exam.code}`}
                className="surface-card group p-5 transition-shadow hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-title group-hover:text-accent-700 dark:group-hover:text-accent-400">
                      {exam.name}
                    </h3>
                    <p className="text-muted mt-1">{exam.detail}</p>
                  </div>
                  <Badge tone="accent">{exam.speed}</Badge>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <Cta to="/exams" variant="secondary">
              Browse the full catalogue
            </Cta>
          </div>
        </div>
      </section>

      {/* ---- The closing call to action ---- */}
      <section className="container-page py-16">
        <div className="surface-card mx-auto max-w-3xl p-8 text-center sm:p-12">
          <h2 className="text-display">Three tests a day, free</h2>
          <p className="text-body mx-auto mt-4 max-w-xl">
            Enough to see where you stand and where you are slow. Upgrade when you want
            the full mock series and the analytics.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {isAuthenticated ? (
              <Cta to="/dashboard">Go to your dashboard</Cta>
            ) : (
              <>
                <Cta to="/sign-up">Create an account</Cta>
                <Cta to="/pricing" variant="secondary">
                  See the plans
                </Cta>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
