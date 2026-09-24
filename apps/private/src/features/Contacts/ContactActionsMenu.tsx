import { Button, IconButton, Stack, Tooltip } from '@linagora/twake-mui'
import { Icon, Trash } from '@linagora/twake-icons'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { deleteContact } from '@common/features/Contacts/ContactsSlice'
import { selectBook } from '@common/features/Contacts/contactsSelectors'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import { DeleteContactDialog } from './DeleteContactDialog'

interface ContactActionsMenuProps {
  contact: Contact
  addressBookId: string
  onDeleted?: () => void
  readOnly?: boolean
}

type OpenDialog = 'delete' | null

export const ContactActionsMenu: React.FC<ContactActionsMenuProps> = ({
  contact,
  addressBookId,
  onDeleted,
  readOnly
}) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (!book?.canWrite) return null

  const handleCloseDialog = (): void => setOpenDialog(null)
  const handleOpenDeleteDialog = (): void => setOpenDialog('delete')

  const handleEdit = (): void => {
    void navigate(`/contacts/${addressBookId}/${contact.id}/edit`)
  }

  const handleDelete = async (): Promise<void> => {
    if (!openpaasId) return
    try {
      await dispatch(
        deleteContact({
          userId: openpaasId,
          addressBookId,
          contactId: contact.id
        })
      ).unwrap()
      setOpenDialog(null)
      onDeleted?.()
    } catch (error: unknown) {
      const err = error as { message?: string }
      setDeleteError(err.message || t('error.unknown'))
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1}>
        {!readOnly && (
          <>
            <Button variant="contained" onClick={handleEdit}>
              {t('contacts.menu.edit')}
            </Button>
            <Tooltip title={t('contacts.menu.delete')}>
              <IconButton
                aria-label={t('contacts.menu.delete')}
                onClick={handleOpenDeleteDialog}
              >
                <Icon icon={Trash} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>
      {openDialog === 'delete' && (
        <DeleteContactDialog
          contact={contact}
          onClose={handleCloseDialog}
          onConfirm={() => void handleDelete()}
        />
      )}
      <ErrorSnackbar error={deleteError} onClose={() => setDeleteError(null)} />
    </>
  )
}
