import {
  IconButton,
  Stack,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@linagora/twake-mui'
import { Icon, Trash, Pen, Dots } from '@linagora/twake-icons'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { deleteContact } from '@common/features/Contacts/ContactsSlice'
import { selectBook } from '@common/features/Contacts/contactsSelectors'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import { DeleteContactDialog } from './DeleteContactDialog'

interface ContactRowActionsProps {
  contact: Contact
  addressBookId: string
  readOnly?: boolean
}

type OpenDialog = 'delete' | null

export const ContactRowActions: React.FC<ContactRowActionsProps> = ({
  contact,
  addressBookId,
  readOnly
}) => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const isMenuOpen = Boolean(anchorEl)

  if (readOnly || !book?.canWrite) return null

  const handleCloseDialog = (): void => setOpenDialog(null)
  const handleOpenDeleteDialog = (): void => {
    setAnchorEl(null)
    setOpenDialog('delete')
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = (): void => {
    setAnchorEl(null)
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
    } catch (error: unknown) {
      const err = error as { message?: string }
      setDeleteError(err.message || t('error.unknown'))
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1}>
        {/* TEMPORARY: reveal on row hover through CSS until twake-mui ships a
            MuiTableRow rule for hover-only actions. VirtualizedTable owns the
            row, so the old isHovered state is no longer reachable from here.
            The menu is portaled, so the row loses :hover while it is open. */}
        <Tooltip title={t('contacts.menu.edit')}>
          <IconButton
            size="xsmall"
            aria-label={t('contacts.menu.edit')}
            onClick={handleEdit}
            sx={{
              visibility: isMenuOpen ? 'visible' : 'hidden',
              '.MuiTableRow-root:hover &': { visibility: 'visible' }
            }}
          >
            <Icon icon={Pen} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('contacts.menu.more')}>
          <IconButton
            size="xsmall"
            aria-label={t('contacts.menu.more')}
            onClick={handleMenuOpen}
          >
            <Icon icon={Dots} />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose}>
          <MenuItem onClick={handleOpenDeleteDialog}>
            <ListItemIcon>
              <Icon icon={Trash} />
            </ListItemIcon>
            <ListItemText>{t('contacts.menu.delete')}</ListItemText>
          </MenuItem>
        </Menu>
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
