import { prefersMoreContrast } from './systemContrast'

const matchMediaMatching =
  (...matching: string[]): Window['matchMedia'] =>
  query =>
    ({ matches: matching.includes(query) }) as MediaQueryList

describe('prefersMoreContrast', () => {
  it('follows prefers-contrast: more', () => {
    expect(
      prefersMoreContrast(matchMediaMatching('(prefers-contrast: more)'))
    ).toBe(true)
  })

  it('follows forced-colors: active', () => {
    expect(
      prefersMoreContrast(matchMediaMatching('(forced-colors: active)'))
    ).toBe(true)
  })

  it('is false when the OS asks for nothing', () => {
    expect(prefersMoreContrast(matchMediaMatching())).toBe(false)
  })

  it('is false when matchMedia is unavailable', () => {
    expect(prefersMoreContrast(undefined)).toBe(false)
  })
})
