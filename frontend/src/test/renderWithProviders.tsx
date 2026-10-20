import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Renders a component with the providers it needs.
 *
 * The router needs a matching `Route`, because `useParams` reads the
 * pattern from the route and not from the URL alone. A `MemoryRouter` on
 * its own leaves the params empty, and a component that depends on them
 * silently does nothing.
 *
 * @param ui the component to render
 * @param options the route pattern and the initial URL
 */
export function renderWithProviders(
  ui: ReactElement,
  options: { path?: string; initialEntries?: string[] } = {},
) {
  const { path = '/', initialEntries = ['/'] } = options

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
