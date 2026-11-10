import '@testing-library/jest-dom/vitest'

import { TextEncoder } from 'util'

global.TextEncoder = TextEncoder

// Set timezone to UTC for consistent test results across all environments
process.env.TZ = 'UTC'

// Mock Intl.DateTimeFormat to use UTC timezone by default
const OriginalDateTimeFormat = Intl.DateTimeFormat

// Create a constructor function that preserves prototype
function MockedDateTimeFormat(
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  // Only set timeZone to UTC if not explicitly specified
  const modifiedOptions = options
    ? { timeZone: 'UTC', ...options } // timeZone comes first so options can override it
    : { timeZone: 'UTC' }
  return new OriginalDateTimeFormat(locales, modifiedOptions)
}

// Preserve the prototype so vi.spyOn works on methods
MockedDateTimeFormat.prototype = OriginalDateTimeFormat.prototype

// Preserve static methods
Object.setPrototypeOf(MockedDateTimeFormat, OriginalDateTimeFormat)

global.Intl.DateTimeFormat =
  MockedDateTimeFormat as unknown as typeof Intl.DateTimeFormat

vi.mock('openid-client', () => ({
  discovery: vi.fn(),
  randomPKCECodeVerifier: vi.fn(),
  calculatePKCECodeChallenge: vi.fn(),
  randomState: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  buildEndSessionUrl: vi.fn(),
  authorizationCodeGrant: vi.fn(),
  fetchUserInfo: vi.fn(),
  clockSkew: Symbol('clockSkew')
}))
const originalWarn = console.warn

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

global.ResizeObserver = ResizeObserverMock

class IntersectionObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

global.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver
// Suppress jsdom CSS selector parsing errors for Emotion/MUI
if (typeof window !== 'undefined' && window.getComputedStyle) {
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called with .call(this) below
  const originalGetComputedStyle = window.getComputedStyle
  window.getComputedStyle = function (
    element: Element,
    pseudoElement?: string | null
  ) {
    try {
      return originalGetComputedStyle.call(this, element, pseudoElement)
    } catch (error) {
      // If CSS selector parsing fails, return a minimal computed style
      if (
        error instanceof Error &&
        error.message.includes('is not a valid selector')
      ) {
        return {
          getPropertyValue: () => ''
        } as unknown as CSSStyleDeclaration
      }
      throw error
    }
  }
}

beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('React Router Future Flag Warning')
    ) {
      return
    }
    originalWarn(...args)
  }
})
