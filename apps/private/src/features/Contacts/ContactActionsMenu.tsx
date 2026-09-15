import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem
} from '@linagora/twake-mui'
import { Dots, Icon, Pen, Trash } from '@linagora/twake-icons'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { deleteContact } from '@common/features/Contacts/ContactsSlice'
import { selectBook } from '@common/features/Contacts/contactsSelectors'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import { DeleteContactDialog } from './DeleteContactDialog'

interface ContactActionsMenuProps {
  contact: Contact
  addressBookId: string
  onDeleted?: () => void
}

type OpenDialog = 'delete' | null

export const ContactActionsMenu: React.FC<ContactActionsMenuProps> = ({
  contact,
  addressBookId,
  onDeleted
}) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)

  if (!book?.canWrite) return null

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget)
  }
  const handleCloseMenu = (): void => setAnchorEl(null)
  const handleCloseDialog = (): void => setOpenDialog(null)
  const openDialogFromMenu = (dialog: OpenDialog) => (): void => {
    setAnchorEl(null)
    setOpenDialog(dialog)
  }

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
    } catch {
      // error is surfaced by the contacts slice
    }
  }

  return (
    <>
      <IconButton aria-label={t('contacts.menu.more')} onClick={handleOpenMenu}>
        <Icon icon={Dots} />
      </IconButton>
      <Menu
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Icon icon={Pen} />
          </ListItemIcon>
          <ListItemText>{t('contacts.menu.edit')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={openDialogFromMenu('delete')}>
          <ListItemIcon>
            <Icon icon={Trash} />
          </ListItemIcon>
          <ListItemText slotProps={{ primary: { color: 'error' } }}>
            {t('contacts.menu.delete')}
          </ListItemText>
        </MenuItem>
      </Menu>
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
