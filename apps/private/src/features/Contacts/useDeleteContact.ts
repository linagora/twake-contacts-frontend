import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { deleteContact } from '@common/features/Contacts/ContactsSlice'
import { Contact } from '@common/features/Contacts/contactsTypes'

/**
 * Deletes the contact and resolves to whether it succeeded. A failure is
 * reported by the contacts slice, so callers never display it themselves.
 */
export const useDeleteContact = (
  addressBookId: string,
  contact: Contact
): (() => Promise<boolean>) => {
  const dispatch = useAppDispatch()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)

  return async () => {
    if (!openpaasId) return false
    const result = await dispatch(
      deleteContact({
        userId: openpaasId,
        addressBookId,
        contactId: contact.id
      })
    )
    return deleteContact.fulfilled.match(result)
  }
}
