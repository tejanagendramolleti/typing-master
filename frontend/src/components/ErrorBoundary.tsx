import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * The props the boundary takes.
 */
interface ErrorBoundaryProps {
  children: ReactNode
}

/**
 * The state the boundary keeps.
 */
interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches a failure in the interface and shows it, rather than a blank page.
 *
 * A mistake in a component — a field the server renamed, say — takes the
 * whole tree down with it when nothing catches it, and the candidate is
 * left looking at an empty window with no way back. The boundary keeps the
 * failure to the part of the page that caused it and gives the reader a
 * way out.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The error is in the browser's console, which is where a developer
    // looks first. There is no error reporting service in this build.
    console.error('The interface hit an error.', error, info.componentStack)
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div className="container-page py-24 text-center">
        <p className="eyebrow mb-2">Something went wrong</p>
        <h1 className="text-display">This page could not be shown</h1>
        <p className="text-body mx-auto mt-3 max-w-xl">
          The failure has been written to the browser's console. Reloading the page
          usually clears it.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button type="button" className="btn-secondary" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <a href="/" className="btn-primary">
            Back to the home page
          </a>
        </div>
        {import.meta.env.DEV && (
          <pre className="mx-auto mt-8 max-w-2xl overflow-x-auto rounded-xl bg-ink-100 p-4 text-left text-xs text-ink-700 dark:bg-ink-800 dark:text-ink-200">
            {this.state.error.message}
          </pre>
        )}
      </div>
    )
  }
}
