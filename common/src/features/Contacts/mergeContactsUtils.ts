import { AddressBook, Contact, ContactSocialProfile } from './contactsTypes'
import { JCalProperty } from './davTypes'
import {
  dismissedDuplicatePairs,
  duplicateContactUrn
} from './duplicateDismissals'
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

const isMatrixProfile = (profile: ContactSocialProfile): boolean =>
  profile.type?.trim().toLowerCase() === 'matrix'

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
  union: (a: number, b: number) => boolean
}

const createDisjointSet = (
  size: number,
  dismissed: Map<number, Set<number>>
): DisjointSet => {
  const parent = Array.from({ length: size }, (_, index) => index)
  const sizes = parent.map(() => 1)
  const find = (i: number): number => {
    let current = i
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]]
      current = parent[current]
    }
    return current
  }
  const union = (a: number, b: number): boolean => {
    let rootA = find(a)
    let rootB = find(b)
    if (rootA === rootB) return true
    if (dismissed.get(rootA)?.has(rootB)) return false
    if (sizes[rootA] < sizes[rootB]) [rootA, rootB] = [rootB, rootA]
    parent[rootB] = rootA
    sizes[rootA] += sizes[rootB]

    // Carry all rejected links to the surviving root, including indirect links.
    const movedPeers = dismissed.get(rootB)
    if (movedPeers) {
      const keptPeers = dismissed.get(rootA) ?? new Set<number>()
      for (const peer of movedPeers) {
        const links = dismissed.get(peer)
        links?.delete(rootB)
        links?.add(rootA)
        keptPeers.add(peer)
      }
      dismissed.set(rootA, keptPeers)
      dismissed.delete(rootB)
    }
    return true
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
      p => (isMatrixProfile(p) ? normalizeMatrixId(p.value) : ''),
      byMatrixId
    )
  })

  return [byName, byEmail, byPhone, byMatrixId]
}

const unionEqualKeys = (
  items: KeyedIndex[],
  union: DisjointSet['union']
): void => {
  if (items.length < 2) return
  items.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  let previousKey: string | undefined
  let representatives: number[] = []
  for (const { key, index } of items) {
    // A rejected link can split contacts sharing a key into separate groups.
    // Try each still-separate group so the rejection does not mask new matches.
    representatives =
      key === previousKey
        ? representatives.filter(peer => !union(peer, index))
        : []
    representatives.push(index)
    previousKey = key
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
      id: groupEntries.map(duplicateContactUrn).join('|'),
      entries: groupEntries
    }))
}

/**
 * Finds duplicate contacts by sorting and linearly walking ordered lists for
 * display name, email address, phone number, and Matrix ID. Contacts that
 * match in any of the walks are grouped together unless a dismissed pair
 * would end up in the same group.
 */
export function findDuplicateContactGroups(
  entries: DuplicateContactEntry[]
): DuplicateContactGroup[] {
  if (entries.length < 2) return []

  const { find, union } = createDisjointSet(
    entries.length,
    dismissedDuplicatePairs(entries)
  )
  for (const list of collectKeyedIndices(entries)) {
    unionEqualKeys(list, union)
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
  (contact.socialProfiles?.filter(isMatrixProfile).length ?? 0)

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
const REPEATABLE_OPAQUE_PROPERTIES = new Set(['photo', 'sound'])

// Revision and generating product describe the card, not the person.
const PRIMARY_CARD_PROPERTIES = new Set(['rev', 'prodid'])

function mergePassthroughProperties(
  target: Contact,
  source: Contact,
  conflictFields: Set<string>
): void {
  const properties = [...(target.passthroughProps ?? [])]
  for (const incoming of source.passthroughProps ?? []) {
    const name = incoming[0].toLowerCase()
    if (PRIMARY_CARD_PROPERTIES.has(name)) continue
    const sameName = (target.passthroughProps ?? []).filter(
      prop => prop[0].toLowerCase() === name
    )
    const key = (prop: JCalProperty): string =>
      contactValueKey([prop[0].toLowerCase(), ...prop.slice(1)])
    if (properties.some(prop => key(prop) === key(incoming))) continue
    if (
      sameName.length &&
      !name.startsWith('x-') &&
      !REPEATABLE_OPAQUE_PROPERTIES.has(name)
    ) {
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
