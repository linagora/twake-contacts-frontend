import { Contact } from './contactsTypes'
import { JCalProperty } from './davTypes'
import { DuplicateContactEntry } from './mergeContactsTypes'

export const DUPLICATE_DISMISSAL_PROPERTY = 'x-twake-duplicated-with'

// UID alone cannot distinguish copies of the same card in different books.
export const duplicateContactUrn = ({
  addressBookId,
  contact
}: DuplicateContactEntry): string =>
  `urn:twake:contact:${encodeURIComponent(addressBookId)}:${encodeURIComponent(contact.id)}`

export const dismissedDuplicateUrns = (contact: Contact): Set<string> => {
  const urns = new Set<string>()
  for (const [name, , , value] of contact.passthroughProps ?? []) {
    if (
      name.toLowerCase() === DUPLICATE_DISMISSAL_PROPERTY &&
      typeof value === 'string'
    ) {
      urns.add(value)
    }
  }
  return urns
}

export const duplicateDismissalProperty = (urn: string): JCalProperty => [
  DUPLICATE_DISMISSAL_PROPERTY,
  {},
  'text',
  urn
]

export function dismissedDuplicatePairs(
  entries: DuplicateContactEntry[]
): Map<number, Set<number>> {
  const indices = new Map(
    entries.map((entry, index) => [duplicateContactUrn(entry), index])
  )
  const pairs = new Map<number, Set<number>>()
  const addPeer = (index: number, peer: number): void => {
    const peers = pairs.get(index) ?? new Set<number>()
    peers.add(peer)
    pairs.set(index, peers)
  }
  entries.forEach(({ contact }, index) => {
    for (const urn of dismissedDuplicateUrns(contact)) {
      const peer = indices.get(urn)
      if (peer === undefined || peer === index) continue
      addPeer(index, peer)
      addPeer(peer, index)
    }
  })
  return pairs
}
