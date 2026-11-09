/**
 * Temporary fallback. This should be in twake-mui.
 */
const segmenter = new Intl.Segmenter()

const INITIAL_CANDIDATE = /[\p{L}\p{N}\p{Extended_Pictographic}]/u

const graphemesOf = (text: string): string[] =>
  Array.from(segmenter.segment(text), ({ segment }) => segment)

const firstGrapheme = (text: string): string => graphemesOf(text)[0] ?? ''

/**
 * First letter, digit or emoji of a word, as a whole grapheme, upper-cased
 * without letting the case mapping expand it (ß -> SS, ﬁ -> FI).
 */
const initialOf = (word: string): string => {
  const candidate = graphemesOf(word).find(grapheme =>
    INITIAL_CANDIDATE.test(grapheme)
  )
  return candidate ? firstGrapheme(candidate.toUpperCase()) : ''
}

export const getInitials = (displayName: string): string => {
  const initials = displayName.split(/\s+/).map(initialOf).filter(Boolean)
  if (initials.length === 0) return ''
  const [first, ...rest] = initials
  return `${first}${rest.at(-1) ?? ''}`
}
