import {
  Button,
  IconButton,
  Stack,
  Tooltip,
  useBreakpoints
} from '@linagora/twake-mui'
import { Icon, Pen, Trash } from '@linagora/twake-icons'
import { useAppSelector } from '@common/app/hooks'
import { selectBook } from '@common/features/Contacts/contactsSelectors'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'
import { editContactPath } from './contactPath'
import { DeleteContactDialog } from './DeleteContactDialog'
import { useDeleteContact } from './useDeleteContact'

interface ContactActionsBarProps {
  primaryAction: React.ReactNode
  onDelete?: () => void
  readOnly?: boolean
}

export const ContactActionsBar: React.FC<ContactActionsBarProps> = ({
  primaryAction,
  onDelete,
  readOnly
}) => {
  const { t } = useI18n()

  if (readOnly) return null

  return (
    <Stack direction="row" spacing={1}>
      {primaryAction}
      {onDelete && (
        <Tooltip disableInteractive title={t('contacts.menu.delete')}>
          <IconButton aria-label={t('contacts.menu.delete')} onClick={onDelete}>
            <Icon icon={Trash} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  )
}

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
  const { isMobile } = useBreakpoints()
  const navigate = useNavigate()
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const deleteContact = useDeleteContact(addressBookId, contact)

  if (!book?.canWrite) return null

  const handleCloseDialog = (): void => setOpenDialog(null)
  const handleOpenDeleteDialog = (): void => setOpenDialog('delete')

  const handleEdit = (): void => {
    void navigate(editContactPath(addressBookId, contact.id))
  }

  const handleDelete = async (): Promise<void> => {
    const deleted = await deleteContact()
    setOpenDialog(null)
    if (deleted) onDeleted?.()
  }

  return (
    <>
      <ContactActionsBar
        primaryAction={
          isMobile ? (
            <Tooltip title={t('contacts.menu.edit')}>
              <IconButton
                aria-label={t('contacts.menu.edit')}
                onClick={handleEdit}
              >
                <Icon icon={Pen} />
              </IconButton>
            </Tooltip>
          ) : (
            <Button variant="contained" onClick={handleEdit}>
              {t('contacts.menu.edit')}
            </Button>
          )
        }
        onDelete={handleOpenDeleteDialog}
        readOnly={readOnly}
      />
      {openDialog === 'delete' && (
        <DeleteContactDialog
          contact={contact}
          onClose={handleCloseDialog}
          onConfirm={() => void handleDelete()}
        />
      )}
    </>
  )
}
