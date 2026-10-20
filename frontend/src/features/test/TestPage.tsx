import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge, Banner, Card, ErrorState, LoadingState } from '../../components/ui'
import { OnScreenKeyboard } from '../../keyboard/OnScreenKeyboard'
import { getLayout } from '../../keyboard'
import type { KeyEvent } from '../../keyboard/types'
import { get, post } from '../../lib/api'
import type { AttemptResult, AttemptSummary } from '../../lib/types'
import { PassageView } from './PassageView'
import { useTyping } from './useTyping'

/** The font stack for the language being typed. */
const LANGUAGE_FONTS: Record<string, string> = {
  EN: 'font-sans',
  HI: 'font-devanagari',
  TE: 'font-telugu',
  ALNUM: 'font-mono',
}

/** Formats the time left as minutes and seconds. */
function formatClock(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * The typing test screen.
 *
 * The screen is the product. Everything else is in service of it: the
 * passage is at the top, the typing area is in the middle, and the clock
 * and the live speed are in the corner where the eye already goes.
 */
export default function TestPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const id = Number(attemptId)

  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showKeyboard, setShowKeyboard] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: attempt, isLoading, isError, error } = useQuery({
    queryKey: ['attempt', id],
    queryFn: () => get<AttemptSummary>(`/api/v1/attempts/${id}`),
    enabled: Number.isFinite(id),
  })

  const layout = useMemo(
    () => getLayout(attempt?.keyboardLayout ?? 'en-qwerty'),
    [attempt?.keyboardLayout],
  )

  /**
   * The submit is called when the test ends, either by the timer or by the
   * candidate pressing the button.
   */
  const submit = useMutation({
    mutationFn: (payload: { typedText: string; events: unknown[]; autoSubmitted: boolean }) =>
      post<AttemptResult>(`/api/v1/attempts/${id}/submit`, payload),
    onSuccess: (result) => {
      navigate(`/result/${result.attemptId}`, { replace: true })
    },
    onError: (caught) => {
      setSubmitError(
        caught instanceof Error ? caught.message : 'The test could not be submitted.',
      )
    },
  })

  const handleExpire = useCallback(() => {
    // The hook calls this when the clock runs out. The submission itself is
    // made by the effect below, which watches the expired flag.
  }, [])

  const typing = useTyping({
    reference: attempt?.referenceText ?? '',
    layout,
    durationMs: (attempt?.durationSeconds ?? 0) * 1000,
    showLiveWpm: attempt?.showLiveWpm ?? true,
    onExpire: handleExpire,
  })

  // Submit when the time runs out.
  useEffect(() => {
    if (!typing.isExpired || submit.isPending || submit.isSuccess) return
    submit.mutate({
      typedText: typing.text,
      events: typing.events,
      autoSubmitted: true,
    })
    // `typing.events` is a stable array reference for the life of the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing.isExpired, submit.isPending, submit.isSuccess])

  // ---- The key handler ---------------------------------------------------

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      // The browser's own shortcuts are left alone.
      if (event.ctrlKey && event.code !== 'Backspace') return
      if (event.metaKey || event.altKey) return

      if (event.code === 'Tab') {
        event.preventDefault()
        return
      }

      // A key the layout does not handle should not reach the browser's
      // default either, or the text area would grow a stray character.
      const keyEvent: KeyEvent = {
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
      }

      const handled = layout.mapKey(keyEvent, typing.layoutState)
      if (handled.consumed || event.code === 'Backspace') {
        event.preventDefault()
      }

      typing.handleKey(keyEvent)
    },
    [layout, typing],
  )

  // ---- The anti-cheat measures -------------------------------------------

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault()
      typing.markCheat('PASTE_ATTEMPT')
    }
    const onDrop = (event: DragEvent) => {
      event.preventDefault()
      typing.markCheat('DROP_ATTEMPT')
    }
    const onCopy = (event: ClipboardEvent) => {
      event.preventDefault()
      typing.markCheat('COPY_ATTEMPT')
    }
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault()
      typing.markCheat('CONTEXT_MENU')
    }
    const onBlur = () => typing.markCheat('BLUR')

    document.addEventListener('paste', onPaste)
    document.addEventListener('drop', onDrop)
    document.addEventListener('copy', onCopy)
    document.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('blur', onBlur)

    return () => {
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('drop', onDrop)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('blur', onBlur)
    }
  }, [typing])

  // ---- The full screen mode ----------------------------------------------

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.()
      setIsFullScreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullScreen(false)
    }
  }, [])

  // ---- The next key hint --------------------------------------------------

  const nextKey = useMemo(
    () => layout.nextExpectedKey(attempt?.referenceText ?? '', typing.text),
    [layout, attempt?.referenceText, typing.text],
  )

  // ---- The submission -----------------------------------------------------

  const handleSubmit = useCallback(() => {
    if (submit.isPending) return
    submit.mutate({
      typedText: typing.text,
      events: typing.events,
      autoSubmitted: false,
    })
  }, [submit, typing])

  if (isLoading) return <LoadingState label="Loading the test" />

  if (isError || !attempt) {
    return (
      <div className="container-page py-12">
        <ErrorState
          title="That test could not be opened"
          message={error instanceof Error ? error.message : 'It may have expired.'}
          action={
            <Link to="/exams" className="btn-secondary">
              Back to the catalogue
            </Link>
          }
        />
      </div>
    )
  }

  const isUrgent = typing.remainingMs <= 30_000

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${isFullScreen ? 'h-screen bg-ink-50 dark:bg-surface-dark' : 'min-h-screen'}`}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* ---- The top bar ---- */}
      <div className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur dark:border-ink-800 dark:bg-surface-dark/90">
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Badge tone="accent">{attempt.examName}</Badge>
            <span className="truncate text-sm text-ink-500 dark:text-ink-400">
              {attempt.language}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {attempt.showLiveWpm && typing.liveWpm !== null && (
              <span className="font-mono text-sm tabular-nums text-ink-600 dark:text-ink-300">
                <span className="text-ink-400 dark:text-ink-500">wpm </span>
                {typing.liveWpm}
              </span>
            )}
            <span
              className={`font-mono text-lg font-semibold tabular-nums ${
                isUrgent ? 'text-state-bad' : 'text-ink-900 dark:text-ink-50'
              }`}
              role="timer"
              aria-live="off"
            >
              {formatClock(typing.remainingMs)}
            </span>

            <button
              type="button"
              onClick={toggleFullScreen}
              className="btn-ghost btn-sm"
              title="Full-screen exam mode"
            >
              {isFullScreen ? 'Exit full screen' : 'Full screen'}
            </button>
            <button
              type="button"
              onClick={() => setShowKeyboard((shown) => !shown)}
              className="btn-ghost btn-sm"
            >
              {showKeyboard ? 'Hide keyboard' : 'Show keyboard'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submit.isPending || typing.isExpired}
              className="btn-primary btn-sm"
            >
              {submit.isPending ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      </div>

      {/* ---- The passage ---- */}
      <div className="container-page flex-1 py-8">
        {submitError && (
          <div className="mb-6">
            <Banner tone="bad" title="The test could not be submitted">
              {submitError} You can press Submit again.
            </Banner>
          </div>
        )}

        {typing.cheatAttempted && (
          <div className="mb-6">
            <Banner tone="warn" title="Recorded">
              An attempt to paste, drop or use the context menu was recorded against this
              test.
            </Banner>
          </div>
        )}

        <Card className="mb-6">
          <PassageView reference={attempt.referenceText} typed={typing.text} />
        </Card>

        {/* ---- The typing area ---- */}
        <div
          className={`surface-card focus-within:ring-2 focus-within:ring-accent-500/40 ${
            LANGUAGE_FONTS[attempt.language] ?? 'font-sans'
          }`}
        >
          <label htmlFor="typing-area" className="label px-5 pt-4 sm:px-6">
            Type the passage above
          </label>
          <textarea
            id="typing-area"
            value={typing.text}
            readOnly
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            aria-label="The text you have typed"
            className="min-h-[8rem] w-full resize-none border-0 bg-transparent px-5 pb-5 font-mono text-base leading-relaxed text-ink-800 outline-none sm:px-6 dark:text-ink-100"
          />
        </div>

        {/* ---- The on-screen keyboard ---- */}
        {showKeyboard && (
          <div className="mt-6">
            <Card
              title="On-screen keyboard"
              description="The highlighted key is the next one you need."
            >
              <OnScreenKeyboard layout={layout} nextKey={nextKey} />
            </Card>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500 dark:text-ink-400">
          <span>
            {typing.keystrokes} keys · {typing.backspaces} backspaces
            {!attempt.backspaceAllowed && ' · backspace is not allowed in this exam'}
          </span>
          <span>
            {typing.text.length} characters
          </span>
        </div>
      </div>
    </div>
  )
}
