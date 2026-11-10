import React, { useState } from 'react'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import {
  canShareAddressBook,
  getAddressBookDisplayName
} from '@common/features/Contacts/contactsUtils'
import {
  Download,
  Icon,
  Pen,
  ShareExternal,
  Trash
} from '@linagora/twake-icons'
import {
  ActionsMenu,
  ActionsMenuItem,
  ListItemIcon,
  ListItemText
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { useAppDispatch } from '@common/app/hooks'
import {
  deleteAddressBook,
  updateAddressBook
} from '@common/features/Contacts/ContactsSlice'
import { useContactsExport } from '@common/features/Contacts/hooks/useContactsExport'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { downloadFile, toFileName } from '@common/utils/downloadFile'
import { ShareAddressBookDialog } from '../ShareAddressBook/ShareAddressBookDialog'
import { DeleteAddressBookDialog } from '../DeleteAddressBookDialog'
import { EditAddressBookDialog } from '../EditAddressBookDialog'

export interface UseAddressBookActionsParams {
  book: AddressBook
  // called once the book is deleted, or removed from the list of the user
  onRemoved?: () => void
}

export interface AddressBookActions {
  isMenuOpen: boolean
  openMenu: (event: React.MouseEvent<HTMLElement>) => void
  openShareDialog: () => void
  // the menu, anchored on the element that opened it
  menu: React.ReactNode
  // the dialogs of the actions, to keep mounted while the menu is hidden
  dialogs: React.ReactNode
}

/**
 * The actions on an address book (share, edit, export, delete or remove),
 * with their menu and dialogs, so that every place offering them offers the
 * same ones.
 */
export const useAddressBookActions = ({
  book,
  onRemoved
}: UseAddressBookActionsParams): AddressBookActions => {
  const { t } = useI18n()
  const { exportAddressBook } = useContactsExport()
  const dispatch = useAppDispatch()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const isCopy = Boolean(book.ownerId)

  const closeMenu = (): void => setAnchorEl(null)

  const openMenu = (event: React.MouseEvent<HTMLElement>): void => {
    event.stopPropagation()
    event.preventDefault()
    setAnchorEl(event.currentTarget)
  }

  const openShareDialog = (): void => {
    closeMenu()
    setIsShareDialogOpen(true)
  }

  const openEditDialog = (): void => {
    closeMenu()
    setIsEditOpen(true)
  }

  const openDeleteDialog = (): void => {
    closeMenu()
    setIsConfirmOpen(true)
  }

  const exportBook = (): void => {
    closeMenu()
    exportAddressBook(book)
      .then(blob =>
        downloadFile(
          blob,
          toFileName(getAddressBookDisplayName(book, t), 'vcf')
        )
      )
      .catch(() => setExportError(t('contacts.errors.exportAddressBook')))
  }

  const removeBook = (): void => {
    void dispatch(
      deleteAddressBook({ userId: book.userId, addressBookId: book.id })
    )
      .unwrap()
      .then(() => onRemoved?.())
      .catch(() => {})
  }

  const renameBook = (name: string): void => {
    void dispatch(
      updateAddressBook({
        userId: book.userId,
        addressBookId: book.id,
        name
      })
    )
  }

  const isMenuOpen = Boolean(anchorEl)

  const menu = (
    <ActionsMenu
      ref={{ current: anchorEl }}
      open={isMenuOpen}
      onClose={closeMenu}
      onClick={e => e.stopPropagation()}
    >
      {canShareAddressBook(book) && (
        <ActionsMenuItem onClick={openShareDialog}>
          <ListItemIcon>
            <Icon icon={ShareExternal} />
          </ListItemIcon>
          <ListItemText>{t('contacts.menu.share')}</ListItemText>
        </ActionsMenuItem>
      )}
      {book.canWrite && !isCopy && (
        <ActionsMenuItem onClick={openEditDialog}>
          <ListItemIcon>
            <Icon icon={Pen} />
          </ListItemIcon>
          <ListItemText>{t('contacts.menu.rename')}</ListItemText>
        </ActionsMenuItem>
      )}
      <ActionsMenuItem onClick={exportBook}>
        <ListItemIcon>
          <Icon icon={Download} />
        </ListItemIcon>
        <ListItemText>{t('contacts.menu.export')}</ListItemText>
      </ActionsMenuItem>
      <ActionsMenuItem onClick={openDeleteDialog}>
        <ListItemIcon>
          <Icon icon={Trash} />
        </ListItemIcon>
        <ListItemText>
          {t(isCopy ? 'contacts.menu.remove' : 'contacts.menu.delete')}
        </ListItemText>
      </ActionsMenuItem>
    </ActionsMenu>
  )

  const dialogs = (
    <>
      <ErrorSnackbar error={exportError} onClose={() => setExportError(null)} />
      {isShareDialogOpen && (
        <ShareAddressBookDialog
          addressBookId={book.id}
          onClose={() => setIsShareDialogOpen(false)}
        />
      )}
      {isConfirmOpen && (
        <DeleteAddressBookDialog
          book={book}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            setIsConfirmOpen(false)
            removeBook()
          }}
        />
      )}
      {isEditOpen && (
        <EditAddressBookDialog
          book={book}
          onClose={() => setIsEditOpen(false)}
          onConfirm={({ name }) => {
            setIsEditOpen(false)
            renameBook(name)
          }}
        />
      )}
    </>
  )

  return { isMenuOpen, openMenu, openShareDialog, menu, dialogs }
}
