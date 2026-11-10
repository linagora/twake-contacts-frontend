import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { DYNAMIC_KEYS } from './dynamicKeys'
import en from './en.json'
import { flattenDictionary } from './localeUtils'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const SOURCE_DIRECTORIES = ['apps/private/src', 'common/src']
const isProductionSource = (file: string): boolean =>
  ['.ts', '.tsx'].includes(path.extname(file)) &&
  !file.match(/\.(test|d)\.tsx?$/)

const listFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? listFiles(path.join(directory, entry.name))
      : [path.join(directory, entry.name)]
  )

const sources = SOURCE_DIRECTORIES.flatMap(directory =>
  listFiles(path.join(ROOT, directory))
)
  .filter(isProductionSource)
  .map(file => readFileSync(file, 'utf8'))

const matchesIn = (pattern: RegExp): Set<string> =>
  new Set(
    sources.flatMap(source =>
      [...source.matchAll(pattern)].map(match => match[2])
    )
  )

/** Keys passed as a literal to t('…') or t("…") */
const translatedKeys = matchesIn(/\bt\(\s*(['"])([^'"]+)\1/g)
/** Every dotted string literal, e.g. a key stored in a constant map */
const dottedLiterals = matchesIn(/(['"`])(\w+(?:\.\w+)+)\1/g)

const definedKeys = Object.keys(flattenDictionary(en))
const isDefined = (key: string): boolean => definedKeys.includes(key)

describe('translation keys', () => {
  it('finds translated keys in the sources', () => {
    expect(translatedKeys.size).toBeGreaterThan(50)
  })

  it('only translates keys defined in en.json', () => {
    expect([...translatedKeys].filter(key => !isDefined(key))).toEqual([])
  })

  it('defines only keys used literally or listed in dynamicKeys.ts', () => {
    const unusedKeys = definedKeys.filter(
      key => !dottedLiterals.has(key) && !DYNAMIC_KEYS.includes(key)
    )
    expect(unusedKeys).toEqual([])
  })

  it('lists in dynamicKeys.ts only keys defined in en.json', () => {
    expect(DYNAMIC_KEYS.filter(key => !isDefined(key))).toEqual([])
  })
})
