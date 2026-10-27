import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'typing-test.sound.v1'

/**
 * Subtle synthesized keystroke sounds — no audio files, no network.
 * Correct keys get a soft futuristic blip (slightly randomized pitch so
 * fast typing shimmers instead of droning); errors get a low thud.
 * The AudioContext is created lazily on the first keystroke, which is a
 * user gesture, so browsers allow it. Preference persists per device.
 */
export function useKeySounds() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'off'
    } catch {
      return true
    }
  })
  const ctxRef = useRef<AudioContext | null>(null)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    const ctx = ctxRef.current
    return () => {
      ctx?.close().catch(() => {
        /* Already closed — nothing to do. */
      })
    }
  }, [])

  const tone = useCallback(
    (frequency: number, durationSeconds: number, gain: number, type: OscillatorType) => {
      if (!enabledRef.current) return
      try {
        if (!ctxRef.current) {
          const Ctor =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext
          if (!Ctor) return
          ctxRef.current = new Ctor()
        }
        const ctx = ctxRef.current
        if (ctx.state === 'suspended') void ctx.resume()

        const osc = ctx.createOscillator()
        const amp = ctx.createGain()
        const start = ctx.currentTime
        osc.type = type
        osc.frequency.setValueAtTime(frequency, start)
        // Fast attack, exponential decay — a click, not a beep.
        amp.gain.setValueAtTime(0.0001, start)
        amp.gain.exponentialRampToValueAtTime(gain, start + 0.008)
        amp.gain.exponentialRampToValueAtTime(0.0001, start + durationSeconds)
        osc.connect(amp).connect(ctx.destination)
        osc.start(start)
        osc.stop(start + durationSeconds + 0.02)
      } catch {
        /* Audio unavailable — typing stays silent and still works. */
      }
    },
    [],
  )

  const playHit = useCallback(() => {
    tone(1500 + Math.random() * 700, 0.055, 0.06, 'triangle')
  }, [tone])

  const playMiss = useCallback(() => {
    tone(170, 0.1, 0.1, 'sine')
  }, [tone])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
      } catch {
        /* Private browsing — the toggle still works for this visit. */
      }
      return next
    })
  }, [])

  return { enabled, toggle, playHit, playMiss }
}
