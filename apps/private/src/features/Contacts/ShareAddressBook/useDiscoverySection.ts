import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  publishAddressBook,
  fetchAddressBookDetail
} from '@common/features/Contacts/ContactsSlice'

interface UseDiscoverySectionArgs {
  userId: string | undefined
  addressBookId: string | undefined
}

export function useDiscoverySection({
  userId,
  addressBookId
}: UseDiscoverySectionArgs): {
  isPublic: boolean | undefined
  loading: boolean
  isDisabled: boolean
  handleToggle: (
    _event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => Promise<void>
} {
  const dispatch = useAppDispatch()
  const isPublic = useAppSelector(state =>
    addressBookId
      ? state.contacts.addressBooks[addressBookId]?.isPublic
      : undefined
  )
  const [loading, setLoading] = useState(false)

  // Not disabled while saving: a disabled switch drops its focus to <body>
  const isDisabled = isPublic === undefined || !userId || !addressBookId

  const handleToggle = async (
    _event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ): Promise<void> => {
    if (isDisabled || loading) return
    setLoading(true)
    try {
      await dispatch(
        publishAddressBook({
          userId: userId,
          addressBookId: addressBookId,
          publish: checked
        })
      ).unwrap()
      await dispatch(
        fetchAddressBookDetail({
          userId: userId,
          addressBookId: addressBookId,
          silent: true
        })
      ).unwrap()
    } catch {
      // Publication failures preserve state; refresh failures preserve the successful update.
    } finally {
      setLoading(false)
    }
  }

  return { isPublic, loading, isDisabled, handleToggle }
}
