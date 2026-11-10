import { IconButton, Stack, Tooltip, useBreakpoints } from '@linagora/twake-mui'
import { Icon, Pen, Dots } from '@linagora/twake-icons'
import { useAppSelector } from '@common/app/hooks'
import { selectBook } from '@common/features/Contacts/contactsSelectors'
import { Contact } from '@common/features/Contacts/contactsTypes'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { useContactsExport } from '@common/features/Contacts/hooks/useContactsExport'
import { downloadFile, toFileName } from '@common/utils/downloadFile'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useI18n } from 'twake-i18n'
import { contactPath, editContactPath } from './contactPath'
import { CopyContactDialog, MoveContactDialog } from './CopyContactDialog'
import { DeleteContactDialog } from './DeleteContactDialog'
import { ContactRowDropdownMenu } from './ContactRowDropdownMenu'
import { useDeleteContact } from './useDeleteContact'

interface ContactRowActionsProps {
  contact: Contact
  addressBookId: string
}

type OpenDialog = 'delete' | 'copy' | 'move' | null

export const ContactRowActions: React.FC<ContactRowActionsProps> = ({
  contact,
  addressBookId
}) => {
  const { t } = useI18n()
  const { exportContact } = useContactsExport()
  const { isMobile } = useBreakpoints()
  const navigate = useNavigate()
  const params = useParams()
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const deleteContact = useDeleteContact(addressBookId, contact)
  const [exportError, setExportError] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const isMenuOpen = Boolean(anchorEl)
  const isReadOnly = !book?.capabilities.editContacts

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

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        className="u-flex-justify-end"
        onClick={event => event.stopPropagation()}
      >
        {/* TEMPORARY: reveal on row hover through CSS until twake-mui ships a
            MuiTableRow rule for hover-only actions. VirtualizedTable owns the
            row, so the old isHovered state is no longer reachable from here.
            The menu is portaled, so the row loses :hover while it is open. */}
        {!isReadOnly && !isMobile && (
          <Tooltip disableInteractive title={t('contacts.menu.edit')}>
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
        <Tooltip disableInteractive title={t('contacts.menu.more')}>
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
          onOpenCopyDialog={() => {
            setAnchorEl(null)
            setOpenDialog('copy')
          }}
          onOpenMoveDialog={() => {
            setAnchorEl(null)
            setOpenDialog('move')
          }}
          onOpenDeleteDialog={handleOpenDeleteDialog}
          onExport={book ? handleExport : undefined}
          readOnly={isReadOnly}
        />
      </Stack>
      {openDialog === 'copy' && (
        <CopyContactDialog
          contact={contact}
          addressBookId={addressBookId}
          onClose={handleCloseDialog}
        />
      )}
      {openDialog === 'move' && (
        <MoveContactDialog
          contact={contact}
          addressBookId={addressBookId}
          onClose={handleCloseDialog}
          onSuccess={destinationId => {
            if (
              params.addressBookId === addressBookId &&
              params.contactId === contact.id
            ) {
              void navigate(contactPath(destinationId, contact.id))
            }
          }}
        />
      )}
      {openDialog === 'delete' && (
        <DeleteContactDialog
          contact={contact}
          onClose={handleCloseDialog}
          onConfirm={() => void handleDelete()}
        />
      )}
      <ErrorSnackbar error={exportError} onClose={() => setExportError(null)} />
    </>
  )
}
