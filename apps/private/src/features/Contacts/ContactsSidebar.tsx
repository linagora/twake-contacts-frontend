import {
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@linagora/twake-mui'
import { Company, Contacts, Icon, Plus } from '@linagora/twake-icons'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { createContact } from '@common/features/Contacts/ContactsSlice'
import {
  selectCategories,
  selectOwnedBooks
} from '@common/features/Contacts/contactsSelectors'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import {
  ContactFormDialog,
  ContactFormValues,
  EMPTY_CONTACT_FORM_VALUES,
  makeContactFromForm
} from './ContactFormDialog'

const MY_CONTACTS_ID = 'contacts'

export const ContactsSidebar: React.FC = () => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { addressBookId } = useParams()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const categories = useAppSelector(selectCategories)
  const ownedBooks = useAppSelector(selectOwnedBooks)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const otherBooks = Object.values(addressBooks).filter(
    book => book.id !== 'collected' && book.id !== MY_CONTACTS_ID
  )

  const handleOpenCreate = (): void => setIsCreateOpen(true)
  const handleCloseCreate = (): void => setIsCreateOpen(false)
  const handleCreate = async (values: ContactFormValues): Promise<void> => {
    if (!openpaasId) return
    try {
      await dispatch(
        createContact({
          userId: openpaasId,
          addressBookId: values.addressBookId,
          contact: makeContactFromForm(values)
        })
      ).unwrap()
      setIsCreateOpen(false)
    } catch {
      // error is surfaced by the contacts slice
    }
  }

  return (
    <>
      <List component="nav">
        <ListItem disableGutters>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Icon icon={Plus} />}
            onClick={handleOpenCreate}
          >
            {t('contacts.create')}
          </Button>
        </ListItem>
        <ListItem disableGutters disablePadding>
          <ListItemButton
            component={Link}
            to="/contacts"
            selected={addressBookId === undefined}
          >
            <ListItemIcon>
              <Icon icon={Contacts} />
            </ListItemIcon>
            <ListItemText primary={t('contacts.myContacts')} />
          </ListItemButton>
        </ListItem>
        {otherBooks.map(book => (
          <ListItem key={book.id} disableGutters disablePadding>
            <ListItemButton
              component={Link}
              to={`/contacts/${book.id}`}
              selected={addressBookId === book.id}
            >
              <ListItemIcon>
                <Icon icon={Company} />
              </ListItemIcon>
              <ListItemText primary={book.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {isCreateOpen && (
        <ContactFormDialog
          title={t('contacts.form.createTitle')}
          addressBooks={ownedBooks}
          categoryOptions={categories}
          initialValues={{
            ...EMPTY_CONTACT_FORM_VALUES,
            addressBookId: ownedBooks.some(book => book.id === addressBookId)
              ? (addressBookId ?? '')
              : ''
          }}
          onClose={handleCloseCreate}
          onSubmit={handleCreate}
        />
      )}
    </>
  )
}
