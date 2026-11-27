import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  copyContact,
  moveContact,
  setTransferSuccess
} from '@common/features/Contacts/ContactsSlice'
import {
  executeTransferMerge,
  findDestinationDuplicates,
  getTransferMergeAudienceBlock
} from '@common/features/Contacts/hooks/duplicateMergeRunner'
import {
  MergeGroupError,
  toMergeGroupError
} from '@common/features/Contacts/hooks/useDuplicateContacts'
import {
  AddressBookWithContacts,
  Contact
} from '@common/features/Contacts/contactsTypes'
import { isContactTransferDestination } from '@common/features/Contacts/contactsUtils'
import {
  DuplicateContactEntry,
  DuplicateContactGroup
} from '@common/features/Contacts/mergeContactsTypes'
import {
  findDuplicatesOfContactInBook,
  TransferMergeAudienceBlock
} from '@common/features/Contacts/mergeContactsUtils'

export interface UseContactTransferParams {
  contact: Contact
  addressBookId: string
  onClose: () => void
  onSuccess?: (destinationId: string, contactId?: string) => void
  mode: 'copy' | 'move'
}

export interface UseContactTransferResult {
  books: AddressBookWithContacts[]
  sourceBook: AddressBookWithContacts | undefined
  destination: AddressBookWithContacts | undefined
  destinationId: string
  selectDestination: (id: string) => void
  transferring: boolean
  error: boolean
  mergeError: MergeGroupError | null
  mergeAudienceBlock: TransferMergeAudienceBlock | null
  duplicateGroup: DuplicateContactGroup | null
  canTransfer: boolean
  transfer: () => Promise<void>
  confirmWithoutMerge: () => Promise<void>
  confirmMerge: () => Promise<void>
  backToTransfer: () => void
}

interface RefreshedSourceState {
  previousContact: Contact
  entry: DuplicateContactEntry
}

const resolveSourceEntry = (
  refreshedSource: RefreshedSourceState | undefined,
  addressBookId: string,
  contact: Contact
): DuplicateContactEntry =>
  refreshedSource?.previousContact === contact &&
  refreshedSource.entry.addressBookId === addressBookId
    ? refreshedSource.entry
    : { addressBookId, contact }

const dispatchContactTransfer = async (
  dispatch: ReturnType<typeof useAppDispatch>,
  mode: 'copy' | 'move',
  source: AddressBookWithContacts,
  fromAddressBookId: string,
  toAddressBookId: string,
  contact: Contact
): Promise<void> => {
  const args = { fromAddressBookId, toAddressBookId, contact }
  if (mode === 'move') {
    await dispatch(moveContact({ ...args, userId: source.userId })).unwrap()
    return
  }
  await dispatch(copyContact(args)).unwrap()
}

export const useContactTransfer = ({
  contact,
  addressBookId,
  onClose,
  onSuccess,
  mode
}: UseContactTransferParams): UseContactTransferResult => {
  const dispatch = useAppDispatch()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const books = Object.values(addressBooks).filter(
    (book): book is AddressBookWithContacts =>
      isContactTransferDestination(book, addressBookId)
  )
  const [destinationId, setDestinationId] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [error, setError] = useState(false)
  const [mergeError, setMergeError] = useState<MergeGroupError | null>(null)
  const [mergeAudienceBlock, setMergeAudienceBlock] =
    useState<TransferMergeAudienceBlock | null>(null)
  const [duplicateGroup, setDuplicateGroup] =
    useState<DuplicateContactGroup | null>(null)
  const [refreshedSource, setRefreshedSource] = useState<RefreshedSourceState>()

  const sourceEntry = resolveSourceEntry(
    refreshedSource,
    addressBookId,
    contact
  )
  const destination = books.find(book => book.id === destinationId)
  const sourceBook = addressBooks[addressBookId]
  const canTransfer = Boolean(
    sourceBook?.canWrite && destination && !transferring
  )

  const executeTransfer = async (
    source: AddressBookWithContacts
  ): Promise<void> => {
    await dispatchContactTransfer(
      dispatch,
      mode,
      source,
      addressBookId,
      destinationId,
      contact
    )
    onClose()
    onSuccess?.(destinationId, contact.id)
  }

  const runWithStatus = async (
    action: () => Promise<void>,
    onError: (err: unknown) => void
  ): Promise<void> => {
    setTransferring(true)
    setError(false)
    setMergeError(null)
    try {
      await action()
    } catch (err) {
      onError(err)
    } finally {
      setTransferring(false)
    }
  }

  const refreshGroup = (entries: DuplicateContactEntry[]): void => {
    const currentSource = entries.find(
      entry =>
        entry.addressBookId === addressBookId && entry.contact.id === contact.id
    )
    // Subsequent scans must see dismissals even if only the source has one.
    setRefreshedSource(
      currentSource && { previousContact: contact, entry: currentSource }
    )
    setDuplicateGroup(
      currentSource
        ? findDuplicatesOfContactInBook(currentSource, entries)
        : null
    )
  }

  const transfer = async (): Promise<void> => {
    if (!canTransfer || !sourceBook || !destination) return
    await runWithStatus(
      async () => {
        const duplicates = await findDestinationDuplicates(
          openpaasId || destination.userId,
          sourceEntry,
          destination
        )
        if (!duplicates) {
          await executeTransfer(sourceBook)
          return
        }
        const audienceBlock = await getTransferMergeAudienceBlock(
          sourceBook,
          destination
        )
        setMergeAudienceBlock(audienceBlock)
        setDuplicateGroup(duplicates)
      },
      () => setError(true)
    )
  }

  const confirmWithoutMerge = async (): Promise<void> => {
    if (!canTransfer || !sourceBook) return
    await runWithStatus(
      () => executeTransfer(sourceBook),
      () => setError(true)
    )
  }

  const runMerge = async (
    source: AddressBookWithContacts,
    target: AddressBookWithContacts,
    group: DuplicateContactGroup
  ): Promise<void> => {
    const merged = await executeTransferMerge({
      dispatch,
      userId: openpaasId || target.userId,
      mode,
      sourceEntry,
      group,
      books: [source, target],
      refreshGroup
    })
    dispatch(
      setTransferSuccess({
        operation: mode,
        requestId: crypto.randomUUID(),
        contactId: merged.contactId,
        contactName: merged.contactName,
        destinationId
      })
    )
    onClose()
    onSuccess?.(destinationId, merged.contactId)
  }

  const confirmMerge = async (): Promise<void> => {
    if (
      !canTransfer ||
      !sourceBook ||
      !destination ||
      !duplicateGroup ||
      mergeAudienceBlock
    )
      return
    await runWithStatus(
      () => runMerge(sourceBook, destination, duplicateGroup),
      err => {
        const failure = toMergeGroupError(err)
        if (
          failure.reason === 'audience' ||
          failure.reason === 'audienceUnavailable'
        ) {
          setMergeAudienceBlock(failure.reason)
        } else {
          setMergeError(failure)
        }
      }
    )
  }

  const backToTransfer = (): void => {
    setDuplicateGroup(null)
    setError(false)
    setMergeError(null)
    setMergeAudienceBlock(null)
  }

  const selectDestination = (id: string): void => {
    backToTransfer()
    setDestinationId(id)
  }

  return {
    books,
    sourceBook,
    destination,
    destinationId,
    selectDestination,
    transferring,
    error,
    mergeError,
    mergeAudienceBlock,
    duplicateGroup,
    canTransfer,
    transfer,
    confirmWithoutMerge,
    confirmMerge,
    backToTransfer
  }
}
