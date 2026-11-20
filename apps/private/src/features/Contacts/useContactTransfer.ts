import { Dispatch, SetStateAction, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  copyContact,
  moveContact,
  setTransferSuccess
} from '@common/features/Contacts/ContactsSlice'
import {
  executeTransferMerge,
  findDestinationDuplicates
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
  setDestinationId: Dispatch<SetStateAction<string>>
  transferring: boolean
  error: boolean
  mergeError: MergeGroupError | null
  duplicateGroup: DuplicateContactGroup | null
  canTransfer: boolean
  transfer: () => Promise<void>
  confirmWithoutMerge: () => Promise<void>
  confirmMerge: () => Promise<void>
  backToTransfer: () => void
}

const updateDuplicateEntries = (
  prev: DuplicateContactGroup | null,
  entries: DuplicateContactEntry[]
): DuplicateContactGroup | null =>
  prev && entries.length >= 2 ? { ...prev, entries } : null

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
  const [duplicateGroup, setDuplicateGroup] =
    useState<DuplicateContactGroup | null>(null)
  const destination = books.find(book => book.id === destinationId)
  const sourceBook = addressBooks[addressBookId]
  const canTransfer = !!sourceBook?.canWrite && !!destination && !transferring

  const executeTransfer = async (
    source: AddressBookWithContacts
  ): Promise<void> => {
    const args = {
      fromAddressBookId: addressBookId,
      toAddressBookId: destinationId,
      contact
    }
    if (mode === 'move') {
      await dispatch(moveContact({ ...args, userId: source.userId })).unwrap()
    } else {
      await dispatch(copyContact(args)).unwrap()
    }
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

  const transfer = async (): Promise<void> => {
    if (!canTransfer || !sourceBook || !destination) return
    await runWithStatus(
      async () => {
        const duplicates = await findDestinationDuplicates(
          openpaasId || destination.userId,
          { addressBookId, contact },
          destination
        )
        if (duplicates) {
          setDuplicateGroup(duplicates)
          return
        }
        await executeTransfer(sourceBook)
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
      sourceEntry: { addressBookId, contact },
      group,
      books: [source, target],
      refreshGroup: entries =>
        setDuplicateGroup(prev => updateDuplicateEntries(prev, entries))
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
    if (!canTransfer || !sourceBook || !destination || !duplicateGroup) return
    await runWithStatus(
      () => runMerge(sourceBook, destination, duplicateGroup),
      err => setMergeError(toMergeGroupError(err))
    )
  }

  const backToTransfer = (): void => {
    setDuplicateGroup(null)
    setError(false)
    setMergeError(null)
  }

  return {
    books,
    sourceBook,
    destination,
    destinationId,
    setDestinationId,
    transferring,
    error,
    mergeError,
    duplicateGroup,
    canTransfer,
    transfer,
    confirmWithoutMerge,
    confirmMerge,
    backToTransfer
  }
}
