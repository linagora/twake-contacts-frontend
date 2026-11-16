import { AddressBook, Contact, ContactSocialProfile } from './contactsTypes'
import { JCalProperty } from './davTypes'
import {
  DuplicateContactEntry,
  DuplicateContactGroup
} from './mergeContactsTypes'
import { stripTel } from '@common/utils/normalizeIdentity'

/**
 * Only personal books (the default book and user-created personal books) can
 * be deduplicated: DAB, shared/delegated, subscribed, and collected books
 * are excluded.
 */
export const isPersonalMergeableBook = (book: AddressBook): boolean =>
  book.kind === 'default' || book.kind === 'personal'

const normalizePhone = (value: string): string =>
  stripTel(value).replace(/[\s\-().]/g, '')

const normalizeName = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ')

const normalizeEmail = (value: string): string => value.trim().toLowerCase()

const normalizeMatrixId = (value: string): string => value.trim().toLowerCase()

export class MergeContactError extends Error {
  constructor(
    public readonly reason: 'changed' | 'conflict',
    public readonly conflictFields: string[] = []
  ) {
    super(reason)
  }
}

/** Stable comparison includes vCard parameters and properties unknown to the form. */
export const contactValueKey = (value: unknown): string => {
  if (Array.isArray(value)) return JSON.stringify(value.map(contactValueKey))
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => [key, contactValueKey(v)])
    )
  }
  return JSON.stringify(value) ?? ''
}

const profileKey = (profile: ContactSocialProfile): string => {
  const type = profile.type?.trim().toLowerCase() ?? ''
  const value =
    type === 'matrix' ? normalizeMatrixId(profile.value) : profile.value.trim()
  return JSON.stringify([type, value])
}

interface KeyedIndex {
  key: string
  index: number
}

interface DisjointSet {
  find: (i: number) => number
  union: (a: number, b: number) => void
}

const createDisjointSet = (size: number): DisjointSet => {
  const parent = Array.from({ length: size }, (_, index) => index)
  const find = (i: number): number => {
    let current = i
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]]
      current = parent[current]
    }
    return current
  }
  const union = (a: number, b: number): void => {
    const rootA = find(a)
    const rootB = find(b)
    if (rootA !== rootB) parent[rootB] = rootA
  }
  return { find, union }
}

const pushNormalizedKeys = <T>(
  items: T[] | undefined,
  index: number,
  normalize: (item: T) => string,
  target: KeyedIndex[]
): void => {
  for (const item of items ?? []) {
    const key = normalize(item)
    if (key) target.push({ key, index })
  }
}

const collectKeyedIndices = (
  entries: DuplicateContactEntry[]
): KeyedIndex[][] => {
  const byName: KeyedIndex[] = []
  const byEmail: KeyedIndex[] = []
  const byPhone: KeyedIndex[] = []
  const byMatrixId: KeyedIndex[] = []

  entries.forEach(({ contact }, index) => {
    const name = normalizeName(contact.displayName)
    if (name) byName.push({ key: name, index })
    pushNormalizedKeys(
      contact.emails,
      index,
      e => normalizeEmail(e.value),
      byEmail
    )
    pushNormalizedKeys(
      contact.phones,
      index,
      p => normalizePhone(p.value),
      byPhone
    )
    pushNormalizedKeys(
      contact.socialProfiles,
      index,
      p =>
        p.type?.trim().toLowerCase() === 'matrix'
          ? normalizeMatrixId(p.value)
          : '',
      byMatrixId
    )
  })

  return [byName, byEmail, byPhone, byMatrixId]
}

const unionAdjacentEqualKeys = (
  items: KeyedIndex[],
  union: (a: number, b: number) => void
): void => {
  if (items.length < 2) return
  items.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  for (let i = 1; i < items.length; i++) {
    if (items[i].key === items[i - 1].key) {
      union(items[i - 1].index, items[i].index)
    }
  }
}

const groupEntriesByRoot = (
  entries: DuplicateContactEntry[],
  find: (i: number) => number
): DuplicateContactGroup[] => {
  const grouped = new Map<number, DuplicateContactEntry[]>()
  entries.forEach((entry, index) => {
    const root = find(index)
    const bucket = grouped.get(root)
    if (bucket) {
      bucket.push(entry)
    } else {
      grouped.set(root, [entry])
    }
  })

  return [...grouped.values()]
    .filter(groupEntries => groupEntries.length >= 2)
    .map(groupEntries => ({
      id: groupEntries.map(e => `${e.addressBookId}:${e.contact.id}`).join('|'),
      entries: groupEntries
    }))
}

/**
 * Finds duplicate contacts by sorting and linearly walking ordered lists for
 * display name, email address, phone number, and Matrix ID. Contacts that
 * match in any of the walks are grouped together.
 */
export function findDuplicateContactGroups(
  entries: DuplicateContactEntry[]
): DuplicateContactGroup[] {
  if (entries.length < 2) return []

  const { find, union } = createDisjointSet(entries.length)
  for (const list of collectKeyedIndices(entries)) {
    unionAdjacentEqualKeys(list, union)
  }

  return groupEntriesByRoot(entries, find)
}

export interface MergedContactPlan {
  targetAddressBookId: string
  updatedContact: Contact
  toDelete: { addressBookId: string; contactId: string }[]
}

const contactInfoScore = (contact: Contact): number =>
  (contact.phones?.length ?? 0) +
  contact.emails.length +
  (contact.socialProfiles?.length ?? 0)

const findMostCompleteIndex = (entries: DuplicateContactEntry[]): number => {
  let primaryIndex = 0
  let bestScore = contactInfoScore(entries[0].contact)
  for (let i = 1; i < entries.length; i++) {
    const score = contactInfoScore(entries[i].contact)
    if (score > bestScore) {
      bestScore = score
      primaryIndex = i
    }
  }
  return primaryIndex
}

const mergeUniqueEntries = <T>(
  initial: T[],
  incoming: T[],
  normalizeKey: (item: T) => string
): T[] => {
  const result = [...initial]
  const seen = new Set(result.map(normalizeKey).filter(Boolean))
  for (const item of incoming) {
    const key = normalizeKey(item)
    if (key && !seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }
  return result
}

const isEmptyField = (value: unknown): boolean =>
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0)

const ARRAY_MERGE_KEYS = [
  'addresses',
  'urls',
  'nicknames',
  'categories',
  'carriedGroups'
] as const

const METADATA_FILL_KEYS = ['name', 'propertyParams'] as const

// RFC 6350 §§6.2.4 and 6.7.5 allow multiple PHOTO and SOUND properties.
// Other opaque properties (including extensions of unknown cardinality) are
// conservatively treated as single-valued across candidates.
const REPEATABLE_OPAQUE_PROPERTIES = new Set(['photo', 'sound'])

function mergePassthroughProperties(
  target: Contact,
  source: Contact,
  conflictFields: Set<string>
): void {
  const properties = [...(target.passthroughProps ?? [])]
  for (const incoming of source.passthroughProps ?? []) {
    const name = incoming[0].toLowerCase()
    const sameName = (target.passthroughProps ?? []).filter(
      prop => prop[0].toLowerCase() === name
    )
    const key = (prop: JCalProperty): string =>
      contactValueKey([prop[0].toLowerCase(), ...prop.slice(1)])
    if (properties.some(prop => key(prop) === key(incoming))) continue
    if (sameName.length && !REPEATABLE_OPAQUE_PROPERTIES.has(name)) {
      conflictFields.add(name.toUpperCase())
      continue
    }
    properties.push(incoming)
  }
  if (properties.length) target.passthroughProps = properties
}

const SINGLE_VALUE_KEYS = ['birthday', 'org', 'title', 'role', 'note'] as const

function mergeArrayFields(target: Contact, source: Contact): void {
  for (const key of ARRAY_MERGE_KEYS) {
    const values = [...(target[key] ?? []), ...(source[key] ?? [])]
    if (!values.length) continue
    Object.assign(target, {
      [key]: [
        ...new Map(
          values.map(value => [contactValueKey(value), value])
        ).values()
      ]
    })
  }
}

function fillMissingMetadataFields(target: Contact, source: Contact): void {
  for (const key of METADATA_FILL_KEYS) {
    const incoming = source[key]
    if (isEmptyField(incoming) || !isEmptyField(target[key])) continue
    Object.assign(target, { [key]: incoming })
  }
}

function mergeSingleValuedFields(
  target: Contact,
  source: Contact,
  conflictFields: Set<string>
): void {
  for (const key of SINGLE_VALUE_KEYS) {
    const incoming = source[key]
    if (isEmptyField(incoming)) continue
    const current = target[key]
    if (isEmptyField(current)) {
      Object.assign(target, { [key]: incoming })
      if (key === 'birthday' && source.birthdayProp) {
        target.birthdayProp = source.birthdayProp
      }
    } else if (contactValueKey(current) !== contactValueKey(incoming)) {
      conflictFields.add(key)
    }
  }
}

/**
 * Picks the most complete contact (most phone, email, and Matrix ID entries)
 * to update, keeps its name and existing details, appends any non-duplicate
 * phones/emails/social profiles and other compatible fields from the other
 * contacts. Conflicting single-valued fields require manual reconciliation
 * before any contact can be marked for deletion.
 */
export function buildMergedContactPlan(
  entries: DuplicateContactEntry[]
): MergedContactPlan {
  const primaryIndex = findMostCompleteIndex(entries)
  const primary = entries[primaryIndex]
  const duplicates = entries.filter((_, index) => index !== primaryIndex)

  const phones = mergeUniqueEntries(
    primary.contact.phones ?? [],
    duplicates.flatMap(d => d.contact.phones ?? []),
    p => normalizePhone(p.value)
  )
  const emails = mergeUniqueEntries(
    primary.contact.emails,
    duplicates.flatMap(d => d.contact.emails),
    e => normalizeEmail(e.value)
  )
  const socialProfiles = mergeUniqueEntries(
    primary.contact.socialProfiles ?? [],
    duplicates.flatMap(d => d.contact.socialProfiles ?? []),
    profileKey
  )

  const updatedContact: Contact = {
    ...primary.contact,
    emails,
    ...(phones.length > 0 ? { phones } : {}),
    ...(socialProfiles.length > 0 ? { socialProfiles } : {})
  }

  const conflictFields = new Set<string>()
  for (const { contact } of duplicates) {
    mergeArrayFields(updatedContact, contact)
    mergePassthroughProperties(updatedContact, contact, conflictFields)
    fillMissingMetadataFields(updatedContact, contact)
    mergeSingleValuedFields(updatedContact, contact, conflictFields)
  }

  if (conflictFields.size > 0) {
    throw new MergeContactError('conflict', [...conflictFields])
  }

  return {
    targetAddressBookId: primary.addressBookId,
    updatedContact,
    toDelete: duplicates.map(d => ({
      addressBookId: d.addressBookId,
      contactId: d.contact.id
    }))
  }
}
