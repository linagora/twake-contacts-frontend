import { toOperationError } from '@common/utils/errorUtils'
import { AppDispatch } from '@common/app/store'
import { fetchContactForMerge, fetchContactsPage } from '../ContactsDao'
import { deleteContact, updateContact } from '../ContactsSlice'
import { AddressBook, Contact } from '../contactsTypes'
import {
  DuplicateContactEntry,
  DuplicateContactGroup
} from '../mergeContactsTypes'
import {
  buildMergedContactPlan,
  buildMergedContactPlanIntoDestination,
  contactValueKey,
  findDuplicateContactGroups,
  findDuplicatesOfContactInBook,
  MergeContactError,
  MergedContactPlan
} from '../mergeContactsUtils'

export interface MergedContactTarget {
  addressBookId: string
  contactId: string
}

interface ContactSnapshot {
  addressBookId: string
  contact: Contact
  etag: string | undefined
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
    if (!page) break
    for (const entry of page.entries) {
      const key = `${entry.addressBookId}:${entry.contact.id}`
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

export async function findDestinationDuplicates(
  userId: string,
  sourceEntry: DuplicateContactEntry,
  destinationBook: AddressBook
): Promise<DuplicateContactGroup | null> {
  const destinationEntries = await fetchAllBookContacts(
    destinationBook.userId || userId,
    destinationBook
  )
  return findDuplicatesOfContactInBook(sourceEntry, destinationEntries)
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

export interface ExecuteTransferMergeParams {
  dispatch: AppDispatch
  userId: string
  mode: 'copy' | 'move'
  sourceEntry: DuplicateContactEntry
  group: DuplicateContactGroup
  books: AddressBook[]
  refreshGroup: (entries: DuplicateContactEntry[]) => void
}

export interface MergedTransferTarget extends MergedContactTarget {
  contactName: string
}

async function fetchVerifiedGroupSnapshots(
  group: DuplicateContactGroup,
  books: AddressBook[],
  refreshGroup: (entries: DuplicateContactEntry[]) => void
): Promise<ContactSnapshot[]> {
  const results = await Promise.all(
    group.entries.map(entry => fetchEntrySnapshot(entry, books))
  )
  const snapshots = results.filter(
    (entry): entry is ContactSnapshot => entry !== null
  )
  const snapshotEntries = snapshots.map(({ addressBookId, contact }) => ({
    addressBookId,
    contact
  }))
  if (hasGroupChanged(group, snapshots)) {
    refreshGroup(snapshotEntries)
    throw new MergeContactError('changed')
  }
  return snapshots
}

async function applyMergePlan({
  dispatch,
  userId,
  books,
  snapshots,
  plan
}: {
  dispatch: AppDispatch
  userId: string
  books: AddressBook[]
  snapshots: ContactSnapshot[]
  plan: MergedContactPlan
}): Promise<MergedTransferTarget> {
  const targetBook = books.find(b => b.id === plan.targetAddressBookId)
  const targetUserId = targetBook?.userId || userId

  await dispatch(
    updateContact({
      userId: targetUserId,
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
    const itemBook = books.find(b => b.id === item.addressBookId)
    await dispatch(
      deleteContact({
        userId: itemBook?.userId || userId,
        addressBookId: item.addressBookId,
        contactId: item.contactId,
        ignoreNotFound: true,
        etag: findSnapshotEtag(snapshots, item.addressBookId, item.contactId)
      })
    ).unwrap()
  }

  return {
    addressBookId: plan.targetAddressBookId,
    contactId: plan.updatedContact.id,
    contactName: savedTarget.contact.displayName
  }
}

export async function executeGroupMerge({
  dispatch,
  userId,
  group,
  books,
  refreshGroup
}: ExecuteGroupMergeParams): Promise<MergedContactTarget> {
  const snapshots = await fetchVerifiedGroupSnapshots(
    group,
    books,
    refreshGroup
  )
  const snapshotEntries = snapshots.map(({ addressBookId, contact }) => ({
    addressBookId,
    contact
  }))
  const plan = buildMergedContactPlan(snapshotEntries)
  const target = await applyMergePlan({
    dispatch,
    userId,
    books,
    snapshots,
    plan
  })
  return {
    addressBookId: target.addressBookId,
    contactId: target.contactId
  }
}

export async function executeTransferMerge({
  dispatch,
  userId,
  mode,
  sourceEntry,
  group,
  books,
  refreshGroup
}: ExecuteTransferMergeParams): Promise<MergedTransferTarget> {
  const snapshots = await fetchVerifiedGroupSnapshots(
    group,
    books,
    refreshGroup
  )
  const snapshotEntries = snapshots.map(({ addressBookId, contact }) => ({
    addressBookId,
    contact
  }))
  const sourceSnapshot = snapshotEntries.find(
    entry =>
      entry.addressBookId === sourceEntry.addressBookId &&
      entry.contact.id === sourceEntry.contact.id
  )
  const destinationSnapshots = snapshotEntries.filter(
    entry =>
      !(
        entry.addressBookId === sourceEntry.addressBookId &&
        entry.contact.id === sourceEntry.contact.id
      )
  )
  if (!sourceSnapshot || destinationSnapshots.length === 0) {
    refreshGroup(snapshotEntries)
    throw new MergeContactError('changed')
  }

  const plan = buildMergedContactPlanIntoDestination(
    sourceSnapshot,
    destinationSnapshots,
    mode === 'move'
  )
  return applyMergePlan({
    dispatch,
    userId,
    books,
    snapshots,
    plan
  })
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
