import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  deleteContact,
  moveContact,
  updateContact
} from '@common/features/Contacts/ContactsSlice'
import { selectWritableBooks } from '@common/features/Contacts/contactsSelectors'
import { isHiddenAddressBook } from '@common/features/Contacts/contactsUtils'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { Icon, Left } from '@linagora/twake-icons'
import { Button, Stack, Typography } from '@linagora/twake-mui'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useI18n } from 'twake-i18n'
import {
  ContactForm,
  ContactFormValues,
  makeContactFromForm,
  makeFormValuesFromContact
} from './ContactForm'
import { ContactFormSkeleton } from './ContactSkeletons'
import { useContact } from './useContact'

export const EditContactPage: React.FC = () => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { addressBookId = '', contactId } = useParams()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const allWritableBooks = useAppSelector(selectWritableBooks)
  const currentBook = useAppSelector(
    state => state.contacts.addressBooks[addressBookId]
  )
  const formBooks =
    currentBook && !allWritableBooks.some(b => b.id === currentBook.id)
      ? [...allWritableBooks, currentBook]
      : allWritableBooks
  const writableBooks = formBooks.filter(book => book.id !== 'dab')
  const { contact, loading } = useContact(addressBookId, contactId)

  useDocumentTitle(
    !contact && !loading ? t('contacts.notFound') : t('contacts.form.editTitle')
  )

  if (addressBookId === 'dab') {
    return <Navigate to={`/contacts/${addressBookId}/${contactId}`} replace />
  }

  if (loading && !contact) {
    return <ContactFormSkeleton />
  }

  if (!contact) {
    return (
      <Stack spacing={3}>
        <Button
          component={Link}
          to={
            isHiddenAddressBook(addressBookId)
              ? '/contacts'
              : `/contacts/${addressBookId}`
          }
          variant="text"
          startIcon={<Icon icon={Left} />}
        >
          {t('contacts.back')}
        </Button>
        <Typography color="text.secondary">{t('contacts.notFound')}</Typography>
      </Stack>
    )
  }

  const initialValues: ContactFormValues = {
    ...makeFormValuesFromContact(contact, addressBookId),
    addressBookId
  }

  const backTo = `/contacts/${addressBookId}/${contactId}`

  const handleSubmit = async (values: ContactFormValues): Promise<void> => {
    if (!openpaasId) return
    const updatedContact = makeContactFromForm(values, contact)
    try {
      await dispatch(
        updateContact({
          userId: openpaasId,
          addressBookId,
          contact: updatedContact
        })
      ).unwrap()

      if (values.addressBookId && values.addressBookId !== addressBookId) {
        await dispatch(
          moveContact({
            userId: openpaasId,
            fromAddressBookId: addressBookId,
            toAddressBookId: values.addressBookId,
            contact: updatedContact
          })
        ).unwrap()
        void navigate(`/contacts/${values.addressBookId}/${contactId}`)
      } else {
        void navigate(backTo)
      }
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
          contactId
        })
      ).unwrap()
      void navigate(
        isHiddenAddressBook(addressBookId)
          ? '/contacts'
          : `/contacts/${addressBookId}`
      )
    } catch {
      // error is surfaced by the contacts slice
    }
  }

  return (
    <ContactForm
      addressBooks={writableBooks ? writableBooks : []}
      initialValues={initialValues}
      backTo={backTo}
      onSubmit={handleSubmit}
      contact={contact}
      onDelete={handleDelete}
    />
  )
}
