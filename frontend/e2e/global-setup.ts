import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * Brings the application up before the end-to-end tests.
 *
 * The stack is started with the `docker-compose.e2e.yml` override, which
 * raises the rate limits. Every test comes from the same address and each
 * of them registers a new candidate, so the limits that are right for a
 * real deployment would stop the suite halfway through.
 *
 * The override is used whether or not a stack is already running: the
 * command reconciles the containers, so an API that was started without it
 * is recreated with the right configuration.
 *
 * Nothing happens when `E2E_BASE_URL` is set, because then the tests run
 * against a stack somebody else is looking after.
 */
export default async function globalSetup(): Promise<void> {
  if (process.env.E2E_BASE_URL) return

  const here = path.dirname(fileURLToPath(import.meta.url))
  const repository = path.resolve(here, '..', '..')

  execFileSync(
    'docker',
    [
      'compose',
      '-f', 'docker-compose.yml',
      '-f', 'docker-compose.e2e.yml',
      'up',
      '-d',
      '--build',
    ],
    { cwd: repository, stdio: 'inherit' },
  )

  await waitForTheInterface()
}

/**
 * Waits for the interface to answer.
 */
async function waitForTheInterface(): Promise<void> {
  const address = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
  const deadline = Date.now() + 300_000

  while (Date.now() < deadline) {
    try {
      const response = await fetch(address, { signal: AbortSignal.timeout(5_000) })
      if (response.ok) return
    } catch {
      // The stack is not up yet. Try again.
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000))
  }

  throw new Error(`The application did not come up at ${address}.`)
}
