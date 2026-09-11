import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem
} from '@linagora/twake-mui'
import { Dots, Icon, Pen, Trash } from '@linagora/twake-icons'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  deleteContact,
  updateContact
} from '@common/features/Contacts/ContactsSlice'
import {
  selectBook,
  selectCategories
} from '@common/features/Contacts/contactsSelectors'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'
import {
  ContactFormDialog,
  ContactFormValues,
  makeContactFromForm,
  makeFormValuesFromContact
} from './ContactFormDialog'
import { DeleteContactDialog } from './DeleteContactDialog'

interface ContactActionsMenuProps {
  contact: Contact
  addressBookId: string
  onDeleted?: () => void
}

type OpenDialog = 'edit' | 'delete' | null

export const ContactActionsMenu: React.FC<ContactActionsMenuProps> = ({
  contact,
  addressBookId,
  onDeleted
}) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const categories = useAppSelector(selectCategories)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget)
  }
  const handleCloseMenu = (): void => setAnchorEl(null)
  const handleCloseDialog = (): void => setOpenDialog(null)
  const openDialogFromMenu = (dialog: OpenDialog) => (): void => {
    setAnchorEl(null)
    setOpenDialog(dialog)
  }

  const handleEdit = async (values: ContactFormValues): Promise<void> => {
    if (!openpaasId) return
    try {
      await dispatch(
        updateContact({
          userId: openpaasId,
          addressBookId,
          contact: makeContactFromForm(values, contact)
        })
      ).unwrap()
      setOpenDialog(null)
    } catch {
      // error is surfaced by the contacts slice
    }
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
        <MenuItem onClick={openDialogFromMenu('edit')}>
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
      {openDialog === 'edit' && book && (
        <ContactFormDialog
          title={t('contacts.form.editTitle')}
          addressBooks={[book]}
          categoryOptions={categories}
          initialValues={makeFormValuesFromContact(contact, addressBookId)}
          onClose={handleCloseDialog}
          onSubmit={handleEdit}
        />
      )}
      {openDialog === 'delete' && (
        <DeleteContactDialog
          contact={contact}
          onClose={handleCloseDialog}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}
