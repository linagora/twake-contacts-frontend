import { getInitials } from './getInitials'

describe('getInitials', () => {
  it.each([
    ['Jane Doe', 'JD'],
    ['jane mary doe', 'JD'],
    ['  Jane  ', 'J'],
    ['', ''],
    ['   ', '']
  ])('takes the first and last word initials of %j', (name, expected) => {
    expect(getInitials(name)).toBe(expected)
  })

  it.each([
    ['😀 Smile', '😀S'],
    ['𝓐lice 𝓑ob', '𝓐𝓑'],
    ['👩‍💻 Dev', '👩‍💻D'],
    ['émile zola', 'ÉZ']
  ])('keeps the whole first character of %s', (name, expected) => {
    expect(getInitials(name)).toBe(expected)
    expect(getInitials(name).isWellFormed()).toBe(true)
  })

  it.each([
    ['ﬁona ﬂy', 'FF'],
    ['ßa Bo', 'SB']
  ])('gives two letters at most for %s', (name, expected) => {
    expect(getInitials(name)).toBe(expected)
  })

  it.each([
    ['‎Ltr Mark', 'LM'],
    ['​Jane Doe', 'JD'],
    ['(Dr) Jane Doe', 'DD'],
    ['"Jane" Doe', 'JD'],
    ['Jane - Doe', 'JD'],
    ['- -', '']
  ])('takes initials from letters only in %j', (name, expected) => {
    expect(getInitials(name)).toBe(expected)
  })
})
