import { readInitialContrastMode } from './contrastMode'

const storageWith = (value: string | null): Pick<Storage, 'getItem'> => ({
  getItem: () => value
})

const matchMediaMatching =
  (...matching: string[]): Window['matchMedia'] =>
  query =>
    ({ matches: matching.includes(query) }) as MediaQueryList

describe('readInitialContrastMode', () => {
  it('returns the stored choice over the OS preference', () => {
    expect(
      readInitialContrastMode(
        storageWith('default'),
        matchMediaMatching('(prefers-contrast: more)')
      )
    ).toBe('default')
    expect(
      readInitialContrastMode(storageWith('more'), matchMediaMatching())
    ).toBe('more')
  })

  it('follows prefers-contrast: more when nothing is stored', () => {
    expect(
      readInitialContrastMode(
        storageWith(null),
        matchMediaMatching('(prefers-contrast: more)')
      )
    ).toBe('more')
  })

  it('follows forced-colors: active when nothing is stored', () => {
    expect(
      readInitialContrastMode(
        storageWith(null),
        matchMediaMatching('(forced-colors: active)')
      )
    ).toBe('more')
  })

  it('defaults when nothing is stored and the OS asks for nothing', () => {
    expect(
      readInitialContrastMode(storageWith(null), matchMediaMatching())
    ).toBe('default')
  })

  it('ignores an invalid stored value', () => {
    expect(
      readInitialContrastMode(storageWith('bogus'), matchMediaMatching())
    ).toBe('default')
  })

  it('defaults when matchMedia is unavailable', () => {
    expect(readInitialContrastMode(storageWith(null), undefined)).toBe(
      'default'
    )
  })
})
