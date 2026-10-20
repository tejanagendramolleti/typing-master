import { describe, expect, it } from 'vitest'
import { compareWords } from './compareWords'

describe('compareWords', () => {
  it('marks every word as pending when nothing has been typed', () => {
    const words = compareWords('the quick brown fox', '')
    expect(words).toHaveLength(4)
    expect(words.every((word) => word.state === 'pending')).toBe(true)
  })

  it('marks the words that have been typed correctly', () => {
    const words = compareWords('the quick brown fox', 'the quick')
    expect(words[0].state).toBe('correct')
    expect(words[1].state).toBe('correct')
    expect(words[2].state).toBe('pending')
  })

  it('marks a word that does not match as wrong', () => {
    const words = compareWords('the quick brown fox', 'the quik')
    expect(words[1].state).toBe('wrong')
  })

  it('keeps the text of the passage, not what was typed', () => {
    const words = compareWords('the quick', 'teh quik')
    expect(words[0].text).toBe('the')
    expect(words[1].text).toBe('quick')
  })

  it('lines the words up by position', () => {
    const words = compareWords('one two three', 'one two three')
    expect(words.map((word) => word.state)).toEqual(['correct', 'correct', 'correct'])
  })

  it('handles an empty passage', () => {
    expect(compareWords('', '')).toEqual([])
  })

  it('handles an empty typed text with a passage', () => {
    const words = compareWords('a b c', '')
    expect(words).toHaveLength(3)
  })

  it('ignores the words that were typed beyond the passage', () => {
    const words = compareWords('one two', 'one two three four')
    expect(words).toHaveLength(2)
  })

  it('treats a case difference as wrong, because the live view is exact', () => {
    const words = compareWords('The', 'the')
    expect(words[0].state).toBe('wrong')
  })

  it('treats a missing space as two wrong words', () => {
    const words = compareWords('the quick', 'thequick')
    expect(words[0].state).toBe('wrong')
    expect(words[1].state).toBe('pending')
  })

  it('handles a passage with a single word', () => {
    const words = compareWords('word', 'word')
    expect(words).toEqual([{ text: 'word', state: 'correct' }])
  })
})
