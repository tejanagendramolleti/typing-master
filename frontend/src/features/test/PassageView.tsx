import { useMemo } from 'react'
import { compareWords } from './compareWords'

/**
 * The passage, with the candidate's progress shown in place.
 */
export function PassageView({
  reference,
  typed,
  className = '',
}: {
  reference: string
  typed: string
  className?: string
}) {
  const words = useMemo(() => compareWords(reference, typed), [reference, typed])

  // The caret goes at the end of the last word the candidate has reached.
  const typedWordCount = typed.length === 0 ? 0 : typed.split(' ').length
  const caretIndex = Math.min(typedWordCount, words.length)

  return (
    <p className={`passage-text ${className}`} aria-label="The passage to type">
      {words.map((word, index) => (
        <span key={`${index}-${word.text}`}>
          <span
            className={
              word.state === 'correct'
                ? 'is-correct'
                : word.state === 'wrong'
                  ? 'is-wrong'
                  : ''
            }
          >
            {word.text}
          </span>
          {index < words.length - 1 && ' '}
          {index === caretIndex && <span className="caret" aria-hidden="true" />}
        </span>
      ))}
    </p>
  )
}
