import { toOperationError } from '@common/utils/errorUtils'
import { AppDispatch } from '@common/app/store'
import { fetchContactForMerge, fetchContactsPage } from '../ContactsDao'
import { deleteContact, updateContact } from '../ContactsSlice'
import { AddressBook, Contact } from '../contactsTypes'
import {
  dismissedDuplicatePairs,
  dismissedDuplicateUrns,
  duplicateContactUrn,
  duplicateDismissalProperty
} from '../duplicateDismissals'
import {
  DuplicateContactEntry,
  DuplicateContactGroup
} from '../mergeContactsTypes'
import {
  buildMergedContactPlan,
  contactValueKey,
  findDuplicateContactGroups,
  MergeContactError
} from '../mergeContactsUtils'

export interface MergedContactTarget {
  addressBookId: string
  contactId: string
}

interface ContactSnapshot {
  addressBookId: string
  contact: Contact
  etag: string
}

async function fetchAllBookContacts(
  userId: string,
  book: AddressBook
): Promise<DuplicateContactEntry[]> {
  const seenIds = new Set<string>()
  const entries: DuplicateContactEntry[] = []
  let after: string | null = null

  while (true) {
    const previousAfter: string | null = after
    const page = await fetchContactsPage(
      userId,
      book,
      { after, sort: { by: 'fn', order: 'asc' } },
      false,
      { cache: 'no-store' }
    )
    for (const entry of page.entries) {
      const key = duplicateContactUrn(entry)
      if (!seenIds.has(key)) {
        seenIds.add(key)
        entries.push(entry)
      }
    }
    after = page.next || null
    if (!after || after === previousAfter) break
  }

  return entries
}

export async function loadPersonalBookDuplicates(
  userId: string,
  books: AddressBook[]
): Promise<DuplicateContactGroup[]> {
  const bookEntries = await Promise.all(
    books.map(book => fetchAllBookContacts(userId, book))
  )
  return findDuplicateContactGroups(bookEntries.flat())
}

async function fetchEntrySnapshot(
  entry: DuplicateContactEntry,
  books: AddressBook[]
): Promise<ContactSnapshot | null> {
  const book = books.find(b => b.id === entry.addressBookId)
  if (!book) throw new MergeContactError('changed')
  try {
    const fetched = await fetchContactForMerge(book, entry.contact.id)
    return { addressBookId: entry.addressBookId, ...fetched }
  } catch (err) {
    if (toOperationError(err, 'read').reason === 'notFound') return null
    throw err
  }
}

/**
 * Compares user-visible contact fields rather than wire/opaque vCard metadata
 * (`passthroughProps`, `propertyParams`, `uidProperty`, `carriedGroups`,
 * `birthdayProp`), which can differ between the book listing and card GET.
 */
function contactComparisonKey(contact: Contact): string {
  return contactValueKey({
    id: contact.id,
    displayName: contact.displayName,
    name: contact.name,
    nicknames: contact.nicknames,
    birthday: contact.birthday,
    emails: contact.emails,
    phones: contact.phones,
    addresses: contact.addresses,
    socialProfiles: contact.socialProfiles,
    urls: contact.urls,
    org: contact.org,
    title: contact.title,
    role: contact.role,
    categories: contact.categories,
    note: contact.note
  })
}

function hasGroupChanged(
  group: DuplicateContactGroup,
  snapshots: ContactSnapshot[]
): boolean {
  if (snapshots.length !== group.entries.length) return true
  return snapshots.some(
    (entry, index) =>
      contactComparisonKey(entry.contact) !==
      contactComparisonKey(group.entries[index].contact)
  )
}

function findSnapshotEtag(
  snapshots: ContactSnapshot[],
  addressBookId: string,
  contactId: string
): string | undefined {
  const match = snapshots.find(
    entry =>
      entry.addressBookId === addressBookId && entry.contact.id === contactId
  )
  return match?.etag
}

export interface ExecuteGroupMergeParams {
  dispatch: AppDispatch
  userId: string
  group: DuplicateContactGroup
  books: AddressBook[]
  refreshGroup: (entries: DuplicateContactEntry[]) => void
}

async function readGroupSnapshots(
  group: DuplicateContactGroup,
  books: AddressBook[],
  refreshGroup: ExecuteGroupMergeParams['refreshGroup']
): Promise<ContactSnapshot[]> {
  const results = await Promise.all(
    group.entries.map(entry => fetchEntrySnapshot(entry, books))
  )
  const snapshots = results.filter(
    (entry): entry is ContactSnapshot => entry !== null
  )
  if (hasGroupChanged(group, snapshots)) {
    refreshGroup(snapshots)
    throw new MergeContactError('changed')
  }
  return snapshots
}

export async function executeGroupDismissal({
  dispatch,
  userId,
  group,
  books,
  refreshGroup
}: ExecuteGroupMergeParams): Promise<void> {
  const snapshots = await readGroupSnapshots(group, books, refreshGroup)
  const urns = snapshots.map(duplicateContactUrn)

  for (const [index, { addressBookId, contact, etag }] of snapshots.entries()) {
    const existing = dismissedDuplicateUrns(contact)
    const additions = urns.filter(
      (urn, peer) => peer !== index && !existing.has(urn)
    )
    if (additions.length === 0) continue

    const saved = await dispatch(
      updateContact({
        userId,
        addressBookId,
        contact: {
          ...contact,
          etag,
          passthroughProps: [
            ...(contact.passthroughProps ?? []),
            ...additions.map(duplicateDismissalProperty)
          ]
        }
      })
    ).unwrap()
    const stored = dismissedDuplicateUrns(saved.contact)
    if (!additions.every(urn => stored.has(urn))) {
      throw new Error('Missing saved duplicate dismissal')
    }
  }
}

export async function executeGroupMerge({
  dispatch,
  userId,
  group,
  books,
  refreshGroup
}: ExecuteGroupMergeParams): Promise<MergedContactTarget> {
  const snapshots = await readGroupSnapshots(group, books, refreshGroup)
  // A dismissal may have been saved since the scan, including on another client.
  if (dismissedDuplicatePairs(snapshots).size > 0) {
    refreshGroup(snapshots)
    throw new MergeContactError('changed')
  }

  const plan = buildMergedContactPlan(snapshots)
  await dispatch(
    updateContact({
      userId,
      addressBookId: plan.targetAddressBookId,
      contact: {
        ...plan.updatedContact,
        etag: findSnapshotEtag(
          snapshots,
          plan.targetAddressBookId,
          plan.updatedContact.id
        )
      }
    })
  ).unwrap()

  // A successful PUT can still be followed by a failed read-back in saveContact.
  // Confirm the target before removing any of the source copies.
  const savedTarget = await fetchEntrySnapshot(
    {
      addressBookId: plan.targetAddressBookId,
      contact: plan.updatedContact
    },
    books
  )
  if (!savedTarget) throw new MergeContactError('changed')

  for (const item of plan.toDelete) {
    await dispatch(
      deleteContact({
        userId,
        addressBookId: item.addressBookId,
        contactId: item.contactId,
        ignoreNotFound: true,
        etag: findSnapshotEtag(snapshots, item.addressBookId, item.contactId)
      })
    ).unwrap()
  }

  return {
    addressBookId: plan.targetAddressBookId,
    contactId: plan.updatedContact.id
  }
}

export async function runQueuedMerges(
  groups: DuplicateContactGroup[],
  limit: number,
  task: (group: DuplicateContactGroup) => Promise<void>
): Promise<void> {
  const queue = [...groups]
  const workerCount = Math.min(limit, queue.length)
  const failures: unknown[] = []
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (queue.length > 0) {
        const nextGroup = queue.shift()
        if (nextGroup) {
          try {
            await task(nextGroup)
          } catch (reason: unknown) {
            failures.push(reason)
          }
        }
      }
    })
  )
  if (failures.length) {
    throw new AggregateError(failures)
  }
}
