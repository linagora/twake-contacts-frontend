import { IconButton, Stack, Tooltip, useBreakpoints } from '@linagora/twake-mui'
import { Icon, Pen, Dots } from '@linagora/twake-icons'
import { useAppSelector } from '@common/app/hooks'
import { selectBook } from '@common/features/Contacts/contactsSelectors'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { useContactsExport } from '@common/features/Contacts/hooks/useContactsExport'
import { downloadFile, toFileName } from '@common/utils/downloadFile'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useI18n } from 'twake-i18n'
import {
  contactPath,
  editContactPath,
  useContactRouteParams
} from './contactPath'
import { CopyContactDialog, MoveContactDialog } from './CopyContactDialog'
import { DeleteContactDialog } from './DeleteContactDialog'
import { ContactRowDropdownMenu } from './ContactRowDropdownMenu'
import { useDeleteContact } from './useDeleteContact'

interface ContactRowActionsProps {
  contact: Contact
  addressBookId: string
}

type OpenDialog = 'delete' | 'copy' | 'move' | null

interface ContactRowDialogsProps {
  openDialog: OpenDialog
  contact: Contact
  addressBookId: string
  onClose: () => void
  onDelete: () => Promise<void>
  onMoveSuccess: (destinationId: string, mergedContactId?: string) => void
}

const ContactRowDialogs: React.FC<ContactRowDialogsProps> = ({
  openDialog,
  contact,
  addressBookId,
  onClose,
  onDelete,
  onMoveSuccess
}) => {
  if (openDialog === 'copy') {
    return (
      <CopyContactDialog
        contact={contact}
        addressBookId={addressBookId}
        onClose={onClose}
      />
    )
  }
  if (openDialog === 'move') {
    return (
      <MoveContactDialog
        contact={contact}
        addressBookId={addressBookId}
        onClose={onClose}
        onSuccess={onMoveSuccess}
      />
    )
  }
  if (openDialog === 'delete') {
    return (
      <DeleteContactDialog
        contact={contact}
        onClose={onClose}
        onConfirm={() => void onDelete()}
      />
    )
  }
  return null
}

export const ContactRowActions: React.FC<ContactRowActionsProps> = ({
  contact,
  addressBookId
}) => {
  const { t } = useI18n()
  const { exportContact } = useContactsExport()
  const { isMobile } = useBreakpoints()
  const navigate = useNavigate()
  const params = useContactRouteParams()
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const deleteContact = useDeleteContact(addressBookId, contact)
  const [exportError, setExportError] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [actions, setActions] = useState<HTMLDivElement | null>(null)

  const isMenuOpen = Boolean(anchorEl)
  const isReadOnly = !book?.capabilities.editContacts
  const showEditButton = !isReadOnly && !isMobile

  const handleCloseDialog = (): void => setOpenDialog(null)
  const openMenuDialog = (dialog: OpenDialog): void => {
    setAnchorEl(null)
    setOpenDialog(dialog)
  }
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>): void =>
    setAnchorEl(event.currentTarget)
  const handleMenuClose = (): void => setAnchorEl(null)

  const handleEdit = (): void => {
    setAnchorEl(null)
    void navigate(editContactPath(addressBookId, contact.id))
  }

  const handleExport = (): void => {
    setAnchorEl(null)
    if (!book) return
    exportContact(book, contact.id)
      .then(blob => downloadFile(blob, toFileName(contact.displayName, 'vcf')))
      .catch(() => setExportError(t('contacts.errors.exportContact')))
  }

  const handleDelete = async (): Promise<void> => {
    await deleteContact()
    setOpenDialog(null)
  }

  const handleMoveSuccess = (
    destinationId: string,
    mergedContactId?: string
  ): void => {
    const isViewingMovedContact =
      params.addressBookId === addressBookId && params.contactId === contact.id
    if (!isViewingMovedContact) return
    void navigate(contactPath(destinationId, mergedContactId ?? contact.id))
  }

  return (
    <>
      <Stack
        ref={setActions}
        direction="row"
        spacing={1}
        className="u-flex-justify-end"
        onClick={event => event.stopPropagation()}
      >
        {/* TEMPORARY: reveal on row hover through CSS until twake-mui ships a
            MuiTableRow rule for hover-only actions. VirtualizedTable owns the
            row, so the old isHovered state is no longer reachable from here.
            The menu is portaled, so the row loses :hover while it is open.
            The tooltips sit beside their button, not below: an interactive
            tooltip below would cover the actions of the next row. */}
        {showEditButton && (
          <Tooltip placement="left" title={t('contacts.menu.edit')}>
            <IconButton
              size="medium"
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
        )}
        {/* left of the whole group, not of the button: the button ends the
            row, a tooltip on its right flips onto the Edit pencil and catches
            its click */}
        <Tooltip
          placement="left"
          title={t('contacts.menu.more')}
          slotProps={actions ? { popper: { anchorEl: actions } } : undefined}
        >
          <IconButton
            size="medium"
            aria-label={t('contacts.menu.more')}
            onClick={handleMenuOpen}
          >
            <Icon icon={Dots} />
          </IconButton>
        </Tooltip>
        <ContactRowDropdownMenu
          contact={contact}
          anchorEl={anchorEl}
          onClose={handleMenuClose}
          onEdit={handleEdit}
          onOpenCopyDialog={() => openMenuDialog('copy')}
          onOpenMoveDialog={() => openMenuDialog('move')}
          onOpenDeleteDialog={() => openMenuDialog('delete')}
          onExport={book ? handleExport : undefined}
          readOnly={isReadOnly}
        />
      </Stack>
      <ContactRowDialogs
        openDialog={openDialog}
        contact={contact}
        addressBookId={addressBookId}
        onClose={handleCloseDialog}
        onDelete={handleDelete}
        onMoveSuccess={handleMoveSuccess}
      />
      <ErrorSnackbar error={exportError} onClose={() => setExportError(null)} />
    </>
  )
}
