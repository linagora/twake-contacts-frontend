export type Dictionary = { [key: string]: string | Dictionary }

/** Flattens a nested dictionary into dotted keys: { a: { b: 'x' } } -> { 'a.b': 'x' } */
export const flattenDictionary = (
  dictionary: Dictionary,
  prefix = ''
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(dictionary).flatMap(([key, value]) =>
      typeof value === 'string'
        ? [[`${prefix}${key}`, value]]
        : Object.entries(flattenDictionary(value, `${prefix}${key}.`))
    )
  )

/** Sorted names of the %{placeholders} of a translation. */
export const placeholdersOf = (value: string): string[] =>
  [...new Set([...value.matchAll(/%\{(\w+)\}/g)].map(match => match[1]))].sort()
