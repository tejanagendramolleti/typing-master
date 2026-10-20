/**
 * How a word in the passage should be drawn.
 */
export type WordState = 'pending' | 'correct' | 'wrong' | 'missing'

/** One word of the passage, with the state it is in. */
export interface RenderedWord {
  /** The word as the passage writes it. */
  text: string
  /** The state it is in. */
  state: WordState
}

/**
 * Compares the passage with what the candidate has typed, word by word.
 *
 * The comparison is deliberately simple: the words are lined up by position,
 * and a word that does not match exactly is wrong. The scoring engine does
 * the careful work — it knows that a case slip is a half mistake and a
 * missing space is another — but the live view only needs to show what is
 * right and what is not.
 *
 * @param reference the passage being typed
 * @param typed what the candidate has typed
 */
export function compareWords(reference: string, typed: string): RenderedWord[] {
  const referenceWords = reference.length === 0 ? [] : reference.split(' ')
  const typedWords = typed.length === 0 ? [] : typed.split(' ')

  return referenceWords.map((word, index) => {
    const typedWord = typedWords[index]
    if (typedWord === undefined) {
      return { text: word, state: 'pending' }
    }
    return {
      text: word,
      state: typedWord === word ? 'correct' : 'wrong',
    }
  })
}
