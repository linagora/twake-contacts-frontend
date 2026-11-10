/**
 * An empty dictionary without prototype: its keys, such as address book ids
 * from the URL or the server, never resolve to an Object.prototype member
 * ('constructor', 'toString', '__proto__'...), so that a missing key reads
 * undefined and any key can be stored as an own entry.
 */
export function createDictionary<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>
}
