import React from 'react'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { useNavigate } from 'react-router'
import { AddressBookMoreActionsButton } from './AddressBookMoreActionsButton'
import { useAddressBookActions } from './useAddressBookActions'

export interface AddressBookMobileActionsProps {
  book: AddressBook
}

/** The actions on a book in the phone layout, where its header is hidden. */
export const AddressBookMobileActions: React.FC<
  AddressBookMobileActionsProps
> = ({ book }) => {
  const navigate = useNavigate()
  const actions = useAddressBookActions({
    book,
    onRemoved: () => void navigate('/contacts')
  })
  return (
    <>
      <AddressBookMoreActionsButton actions={actions} />
      {actions.dialogs}
    </>
  )
}
