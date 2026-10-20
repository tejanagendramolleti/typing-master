/// <reference types="vite/client" />

/**
 * The environment variables the application reads.
 *
 * They are read at build time by Vite, so the values are baked into the
 * bundle. Nothing secret belongs here — the API holds the secrets.
 */
interface ImportMetaEnv {
  /** The base URL of the API. Empty means "the same origin". */
  readonly VITE_API_BASE_URL?: string
  /** The base URL of the frontend, used in the emails. */
  readonly VITE_FRONTEND_BASE_URL?: string
  /** Set to 'true' to show the development-only affordances. */
  readonly VITE_DEV_TOOLS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * The stylesheets, imported for their side effect only.
 */
declare module '*.css' {
  const content: string
  export default content
}
