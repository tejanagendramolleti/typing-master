import type { KeyboardLayout } from './types'

/**
 * The on-screen keyboard.
 *
 * It shows the layout for the language being typed, and highlights the key
 * that comes next in the passage. The hint is what makes the Indic layouts
 * usable: a candidate who is new to Inscript has no way of knowing that
 * `क` is on the `q` key without being told.
 */
export function OnScreenKeyboard({
  layout,
  nextKey,
  onKeyPress,
}: {
  layout: KeyboardLayout
  /** The physical key that comes next, or null when it is not known. */
  nextKey: string | null
  /** Called when a key is pressed on the on-screen keyboard. */
  onKeyPress?: (code: string) => void
}) {
  return (
    <div className="select-none" aria-label={`On-screen ${layout.label} keyboard`}>
      <div className="space-y-1.5">
        {layout.rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1.5">
            {row.keys.map((key) => {
              const isNext = nextKey !== null && key.code === nextKey
              return (
                <button
                  key={key.code}
                  type="button"
                  onClick={() => onKeyPress?.(key.code)}
                  disabled={!onKeyPress || key.modifier}
                  aria-label={key.label}
                  className={[
                    'flex flex-col items-center justify-center rounded-lg border font-medium transition-colors',
                    'h-9 min-w-[2rem] px-1 text-xs',
                    isNext
                      ? 'border-accent-500 bg-accent-500 text-white shadow-focus'
                      : 'border-ink-300 bg-white text-ink-700 hover:bg-ink-100',
                    'dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800',
                    key.modifier ? 'opacity-60' : '',
                  ].join(' ')}
                  style={key.width ? { width: `${key.width * 2.25}rem` } : undefined}
                >
                  <span className="leading-none">{key.label}</span>
                  {key.shiftLabel && (
                    <span
                      className={`mt-0.5 text-[0.625rem] leading-none ${
                        isNext ? 'text-white/80' : 'text-ink-400 dark:text-ink-500'
                      }`}
                    >
                      {key.shiftLabel}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
