import de from './de.json'
import en from './en.json'
import es from './es.json'
import fr from './fr.json'
import italian from './it.json'
import ru from './ru.json'
import vi from './vi.json'
import { flattenDictionary, placeholdersOf } from './localeUtils'

const PLURAL_SEPARATOR = '||||'

const reference = flattenDictionary(en)
const referenceKeys = Object.keys(reference).sort()
const isPlural = (value: string): boolean => value.includes(PLURAL_SEPARATOR)
const pluralKeys = referenceKeys.filter(key => isPlural(reference[key]))

// Number of plural forms of each language, as Polyglot expects them
const translations = [
  { locale: 'fr', dictionary: fr, pluralForms: 2 },
  { locale: 'vi', dictionary: vi, pluralForms: 1 },
  { locale: 'ru', dictionary: ru, pluralForms: 3 },
  { locale: 'es', dictionary: es, pluralForms: 2 },
  { locale: 'de', dictionary: de, pluralForms: 2 },
  { locale: 'it', dictionary: italian, pluralForms: 2 }
].map(({ dictionary, ...translation }) => ({
  ...translation,
  entries: flattenDictionary(dictionary)
}))

const countForms = (value: string | undefined): number =>
  value?.split(PLURAL_SEPARATOR).length ?? 0

describe('locale dictionaries', () => {
  it('en.json has plural translations', () => {
    expect(pluralKeys).not.toEqual([])
  })

  it.each(translations)(
    '$locale has exactly the keys of en.json',
    ({ entries }) => {
      expect(Object.keys(entries).sort()).toEqual(referenceKeys)
    }
  )

  it.each(translations)(
    '$locale uses the same %{placeholders} as en.json',
    ({ entries }) => {
      const mismatches = referenceKeys.filter(
        key =>
          key in entries &&
          placeholdersOf(entries[key]).join() !==
            placeholdersOf(reference[key]).join()
      )
      expect(mismatches).toEqual([])
    }
  )

  it.each(translations)(
    '$locale has all its plural forms where en.json has plural forms',
    ({ entries, pluralForms }) => {
      const mismatches = pluralKeys.filter(
        key => countForms(entries[key]) !== pluralForms
      )
      expect(mismatches).toEqual([])
    }
  )

  it.each(translations)(
    '$locale has no plural forms where en.json has none',
    ({ entries }) => {
      const mismatches = referenceKeys.filter(
        key => !isPlural(reference[key]) && isPlural(entries[key] ?? '')
      )
      expect(mismatches).toEqual([])
    }
  )
})
