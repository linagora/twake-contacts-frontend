import { toOperationError } from '@common/utils/errorUtils'
import { AppDispatch } from '@common/app/store'
import { BookAudience, isAudienceWithin, toBookAudience } from '../bookAudience'
import {
  fetchAddressBookDetails,
  fetchContactForMerge,
  fetchContactsPage
} from '../ContactsDao'
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
  etag: string
}

function appendUnseenEntries(
  target: DuplicateContactEntry[],
  incoming: DuplicateContactEntry[],
  seenIds: Set<string>
): void {
  for (const entry of incoming) {
    const key = duplicateContactUrn(entry)
    if (!seenIds.has(key)) {
      seenIds.add(key)
      target.push(entry)
    }
  }
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
      { after, sort: { by: 'fn', order: 'asc' }, cache: 'no-store' },
      false
    )
    appendUnseenEntries(entries, page.entries, seenIds)
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

const findGroupBook = (
  books: AddressBook[],
  addressBookId: string
): AddressBook => {
  const book = books.find(b => b.id === addressBookId)
  if (!book) throw new MergeContactError('changed')
  return book
}

async function fetchBookAudience(book: AddressBook): Promise<BookAudience> {
  // A delegated book's ACL may only show the current sharee's rights.
  // Use the owner and the original book to read the full audience.
  const owner = book.ownerId ?? book.userId
  const bookId = book.ownerId ? book.sourceBookId : book.id
  if (!owner || !bookId) throw new MergeContactError('audience')
  const audience = toBookAudience(await fetchAddressBookDetails(owner, bookId))
  return { ...audience, members: [...audience.members, owner] }
}

/**
 * Reads, at merge time, who can read each book of the group: a book may have
 * been shared or published since the scan. A group in one book needs none.
 */
async function fetchGroupAudiences(
  snapshots: ContactSnapshot[],
  books: AddressBook[]
): Promise<Map<string, BookAudience>> {
  const bookIds = [...new Set(snapshots.map(entry => entry.addressBookId))]
  if (bookIds.length < 2) return new Map()
  const audiences = await Promise.all(
    bookIds.map(
      async id =>
        [id, await fetchBookAudience(findGroupBook(books, id))] as const
    )
  )
  return new Map(audiences)
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

export async function canMergeIntoDestinationBook(
  sourceBook: AddressBook,
  destinationBook: AddressBook
): Promise<boolean> {
  try {
    const [sourceAudience, destinationAudience] = await Promise.all([
      fetchBookAudience(sourceBook),
      fetchBookAudience(destinationBook)
    ])
    return isAudienceWithin(destinationAudience, sourceAudience)
  } catch (err) {
    if (err instanceof MergeContactError && err.reason === 'audience') {
      return false
    }
    throw err
  }
}

async function fetchEntrySnapshot(
  entry: DuplicateContactEntry,
  books: AddressBook[]
): Promise<ContactSnapshot | null> {
  const book = findGroupBook(books, entry.addressBookId)
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
function contactComparisonKey(
  contact: Contact,
  ignoreListOrder = false
): string {
  // A read-back can reorder repeated properties according to vCard PREF.
  const list = (values: unknown[] | undefined): unknown[] | undefined =>
    ignoreListOrder ? (values ?? []).map(contactValueKey).sort() : values

  return contactValueKey({
    id: contact.id,
    displayName: contact.displayName,
    name: contact.name,
    nicknames: list(contact.nicknames),
    birthday: contact.birthday,
    emails: list(contact.emails),
    phones: list(contact.phones),
    addresses: list(contact.addresses),
    socialProfiles: list(contact.socialProfiles),
    urls: list(contact.urls),
    org: contact.org,
    title: contact.title,
    role: contact.role,
    categories: list(contact.categories),
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

function requireUndismissedGroup(
  snapshots: ContactSnapshot[],
  refreshGroup: ExecuteGroupMergeParams['refreshGroup']
): void {
  // A dismissal may have been saved since the scan, including on another client.
  if (dismissedDuplicatePairs(snapshots).size > 0) {
    refreshGroup(snapshots)
    throw new MergeContactError('changed')
  }
}

async function saveContactDismissals(
  dispatch: AppDispatch,
  userId: string,
  snapshot: ContactSnapshot,
  peerUrns: string[]
): Promise<void> {
  const existing = dismissedDuplicateUrns(snapshot.contact)
  const additions = peerUrns.filter(urn => !existing.has(urn))
  if (additions.length === 0) return

  const saved = await dispatch(
    updateContact({
      userId,
      addressBookId: snapshot.addressBookId,
      contact: {
        ...snapshot.contact,
        etag: snapshot.etag,
        passthroughProps: [
          ...(snapshot.contact.passthroughProps ?? []),
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

export async function executeGroupDismissal({
  dispatch,
  userId,
  group,
  books,
  refreshGroup
}: ExecuteGroupMergeParams): Promise<void> {
  const snapshots = await readGroupSnapshots(group, books, refreshGroup)
  const urns = snapshots.map(duplicateContactUrn)

  for (const [index, snapshot] of snapshots.entries()) {
    const peerUrns = urns.filter((_, peer) => peer !== index)
    await saveContactDismissals(dispatch, userId, snapshot, peerUrns)
  }
}

async function deleteMergedSources(
  dispatch: AppDispatch,
  userId: string,
  books: AddressBook[],
  snapshots: ContactSnapshot[],
  toDelete: { addressBookId: string; contactId: string }[]
): Promise<void> {
  for (const item of toDelete) {
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
  if (
    !savedTarget ||
    contactComparisonKey(savedTarget.contact, true) !==
      contactComparisonKey(plan.updatedContact, true)
  ) {
    throw new MergeContactError('changed')
  }

  await deleteMergedSources(dispatch, userId, books, snapshots, plan.toDelete)

  return {
    addressBookId: plan.targetAddressBookId,
    contactId: plan.updatedContact.id,
    contactName: savedTarget.contact.displayName
  }
}

async function runQueueWorker(
  queue: DuplicateContactGroup[],
  task: (group: DuplicateContactGroup) => Promise<void>,
  failures: unknown[]
): Promise<void> {
  while (true) {
    const nextGroup = queue.shift()
    if (!nextGroup) return
    try {
      await task(nextGroup)
    } catch (reason: unknown) {
      failures.push(reason)
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
  requireUndismissedGroup(snapshots, refreshGroup)
  const plan = buildMergedContactPlan(
    snapshots,
    await fetchGroupAudiences(snapshots, books)
  )
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

const isMatchingEntry = (
  entry: ContactSnapshot,
  target: DuplicateContactEntry
): boolean =>
  entry.addressBookId === target.addressBookId &&
  entry.contact.id === target.contact.id

function partitionTransferSnapshots(
  snapshots: ContactSnapshot[],
  sourceEntry: DuplicateContactEntry,
  refreshGroup: ExecuteTransferMergeParams['refreshGroup']
): { sourceSnapshot: ContactSnapshot; destinationSnapshots: ContactSnapshot[] } {
  const sourceSnapshot = snapshots.find(entry =>
    isMatchingEntry(entry, sourceEntry)
  )
  const destinationSnapshots = snapshots.filter(
    entry => !isMatchingEntry(entry, sourceEntry)
  )
  if (!sourceSnapshot || destinationSnapshots.length === 0) {
    refreshGroup(snapshots)
    throw new MergeContactError('changed')
  }
  return { sourceSnapshot, destinationSnapshots }
}

async function assertDestinationAudienceWithinGroup(
  snapshots: ContactSnapshot[],
  books: AddressBook[],
  destinationAddressBookId: string
): Promise<void> {
  const audiences = await fetchGroupAudiences(snapshots, books)
  const destinationAudience = audiences.get(destinationAddressBookId)
  const isWiderThanAnySource =
    !destinationAudience ||
    [...audiences.values()].some(
      audience => !isAudienceWithin(destinationAudience, audience)
    )
  if (isWiderThanAnySource) throw new MergeContactError('audience')
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
  const snapshots = await readGroupSnapshots(group, books, refreshGroup)
  requireUndismissedGroup(snapshots, refreshGroup)
  const { sourceSnapshot, destinationSnapshots } = partitionTransferSnapshots(
    snapshots,
    sourceEntry,
    refreshGroup
  )
  await assertDestinationAudienceWithinGroup(
    snapshots,
    books,
    destinationSnapshots[0].addressBookId
  )
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
    Array.from({ length: workerCount }, () =>
      runQueueWorker(queue, task, failures)
    )
  )
  if (failures.length) {
    throw new AggregateError(failures)
  }
}
