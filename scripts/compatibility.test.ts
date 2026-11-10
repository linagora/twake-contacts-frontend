import { readFileSync } from 'node:fs'
import path from 'node:path'

// The backend versions the e2e suite runs against must satisfy the minimums declared in the
// "compatibility" field of the root package.json: bumping an e2e image below them, or raising
// them above the tested images, fails here and forces a decision on the declared minimum.

const fromRoot = (file: string): string =>
  path.resolve(import.meta.dirname, '..', file)

type Version = number[]

const parseVersion = (version: string): Version =>
  version.split('.').map(part => {
    const number = Number(part)
    if (!Number.isInteger(number)) {
      throw new Error(`Not a numeric version: ${version}`)
    }
    return number
  })

const compareVersions = (left: Version, right: Version): number => {
  const length = Math.max(left.length, right.length)
  const difference = Array.from(
    { length },
    (_, index) => (left[index] ?? 0) - (right[index] ?? 0)
  ).find(diff => diff !== 0)
  return difference ?? 0
}

const declaredMinimum = (backend: string): string => {
  const { compatibility } = JSON.parse(
    readFileSync(fromRoot('package.json'), 'utf8')
  ) as { compatibility: Record<string, string> }
  const range = compatibility[backend]
  const match = /^>=(\S+)$/.exec(range ?? '')
  if (!match) {
    throw new Error(`Expected ">=X" for ${backend}, got ${range}`)
  }
  return match[1]
}

const pinnedVersion = (dockerfile: string, image: string): string => {
  const content = readFileSync(fromRoot(`e2e/docker/${dockerfile}`), 'utf8')
  const escapedImage = image.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
  const match = new RegExp(`${escapedImage}:([0-9][0-9.]*)`).exec(content)
  if (!match) {
    throw new Error(`No ${image}:<version> in e2e/docker/${dockerfile}`)
  }
  return match[1]
}

describe('compareVersions', () => {
  it.each([
    ['2.4.7.9', '2.4.7.9', 0],
    ['2.4.7.10', '2.4.7.9', 1],
    ['2.4.7.8', '2.4.7.9', -1],
    ['2.5', '2.4.7.9', 1],
    ['2.4.7', '2.4.7.0', 0]
  ])('compares %s with %s', (left, right, sign) => {
    expect(
      Math.sign(compareVersions(parseVersion(left), parseVersion(right)))
    ).toBe(sign)
  })
})

describe.each([
  ['esn-sabre', 'Dockerfile.sabre', 'linagora/esn-sabre'],
  [
    'twake-calendar-side-service',
    'Dockerfile.side-service',
    'linagora/twake-calendar-side-service'
  ]
])('%s compatibility', (backend, dockerfile, image) => {
  it(`the version pinned in e2e/docker/${dockerfile} satisfies the declared minimum`, () => {
    const pinned = parseVersion(pinnedVersion(dockerfile, image))
    const minimum = parseVersion(declaredMinimum(backend))

    expect(compareVersions(pinned, minimum)).toBeGreaterThanOrEqual(0)
  })
})
