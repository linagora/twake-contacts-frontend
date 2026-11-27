import { readInitialContrastMode } from './contrastMode'

const matchMediaMatching =
  (...matching: string[]): Window['matchMedia'] =>
  query =>
    ({ matches: matching.includes(query) }) as MediaQueryList

describe('readInitialContrastMode', () => {
  it('follows prefers-contrast: more', () => {
    expect(
      readInitialContrastMode(matchMediaMatching('(prefers-contrast: more)'))
    ).toBe('more')
  })

  it('follows forced-colors: active', () => {
    expect(
      readInitialContrastMode(matchMediaMatching('(forced-colors: active)'))
    ).toBe('more')
  })

  it('defaults when the OS asks for nothing', () => {
    expect(readInitialContrastMode(matchMediaMatching())).toBe('default')
  })

  it('defaults when matchMedia is unavailable', () => {
    expect(readInitialContrastMode(undefined)).toBe('default')
  })
})
