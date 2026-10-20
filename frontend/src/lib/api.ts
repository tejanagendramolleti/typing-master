/**
 * The API client.
 *
 * A thin wrapper around `fetch` that adds the bearer token, refreshes an
 * expired access token once, and turns an error response into a typed
 * `ApiError` that carries the same envelope the backend uses.
 */

/** The base URL of the API. */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/** Where the tokens are kept between page loads. */
const ACCESS_TOKEN_KEY = 'examtyper.accessToken'
const REFRESH_TOKEN_KEY = 'examtyper.refreshToken'

/** The error the API client throws. */
export class ApiError extends Error {
  /** The HTTP status, or 0 when the request never reached the server. */
  readonly status: number
  /** The machine-readable code from the error envelope. */
  readonly code: string
  /** The field-level validation errors, keyed by field name. */
  readonly fieldErrors: Record<string, string>
  /** The request id, for correlating with the server logs. */
  readonly requestId: string | null

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: Record<string, string> = {},
    requestId: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.requestId = requestId
  }
}

/** The shape of the error envelope the backend returns. */
interface ErrorEnvelope {
  code?: string
  message?: string
  requestId?: string
  fieldErrors?: Record<string, string>
}

/** Reads the stored access token. */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

/** Reads the stored refresh token. */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/** Stores the tokens. */
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

/** Clears the stored tokens. */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/** True when there is a token to work with. */
export function hasToken(): boolean {
  return Boolean(getAccessToken())
}

/** The options for a request. */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Set to false for the public endpoints, which need no token. */
  authenticated?: boolean
  signal?: AbortSignal
}

/**
 * A refresh that is already in flight, shared by every caller that arrives
 * while it is running.
 *
 * Without this, a page that fires five requests at once would send five
 * refreshes, and the rotation would invalidate four of the new tokens.
 */
let refreshInFlight: Promise<boolean> | null = null

async function refreshTokens(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return false
    try {
      const response = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!response.ok) {
        clearTokens()
        return false
      }
      const data = (await response.json()) as { accessToken: string; refreshToken: string }
      setTokens(data.accessToken, data.refreshToken)
      return true
    } catch {
      clearTokens()
      return false
    } finally {
      // Allow the next refresh once this one has settled.
      setTimeout(() => {
        refreshInFlight = null
      }, 0)
    }
  })()

  return refreshInFlight
}

/**
 * Sends a request to the API.
 *
 * An expired access token is refreshed once and the request is retried. A
 * request that fails for any other reason is not retried, because the
 * caller may be about to be shown the error.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, authenticated = true, signal } = options

  const send = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`

    return fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  let response = await send(authenticated ? getAccessToken() : null)

  if (response.status === 401 && authenticated && getRefreshToken()) {
    const refreshed = await refreshTokens()
    if (refreshed) {
      response = await send(getAccessToken())
    }
  }

  if (!response.ok) {
    throw await toApiError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

/** Turns an error response into an `ApiError`. */
async function toApiError(response: Response): Promise<ApiError> {
  const requestId = response.headers.get('X-Request-Id')
  let envelope: ErrorEnvelope = {}
  try {
    envelope = (await response.json()) as ErrorEnvelope
  } catch {
    // A non-JSON error body, for example from a proxy in front of the API.
  }
  return new ApiError(
    response.status,
    envelope.code ?? 'UNKNOWN',
    envelope.message ?? `The request failed with status ${response.status}.`,
    envelope.fieldErrors ?? {},
    envelope.requestId ?? requestId,
  )
}

/** Sends a `GET` request. */
export function get<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'GET' })
}

/** Sends a `POST` request. */
export function post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'POST', body })
}

/** Sends a `PUT` request. */
export function put<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'PUT', body })
}

/** Sends a `DELETE` request. */
export function del<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'DELETE' })
}
