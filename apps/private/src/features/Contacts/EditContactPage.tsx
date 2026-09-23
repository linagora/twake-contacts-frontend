import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  deleteContact,
  updateContact
} from '@common/features/Contacts/ContactsSlice'
import { selectBook } from '@common/features/Contacts/contactsSelectors'
import { isHiddenAddressBook } from '@common/features/Contacts/contactsUtils'
import { Icon, Left } from '@linagora/twake-icons'
import { Button, Stack, Typography } from '@linagora/twake-mui'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import {
  ContactForm,
  ContactFormValues,
  makeContactFromForm,
  makeFormValuesFromContact
} from './ContactForm'

export const EditContactPage: React.FC = () => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { addressBookId = '', contactId } = useParams()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const contact = useAppSelector(state =>
    state.contacts.addressBooks[addressBookId]?.contacts.find(
      c => c.id === contactId
    )
  )

  if (addressBookId === 'dab') {
    return <Navigate to={`/contacts/${addressBookId}/${contactId}`} replace />
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
    try {
      await dispatch(
        updateContact({
          userId: openpaasId,
          addressBookId,
          contact: makeContactFromForm(values, contact)
        })
      ).unwrap()
      void navigate(backTo)
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
      addressBooks={book ? [book] : []}
      initialValues={initialValues}
      addressBookDisabled
      backTo={backTo}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  )
}
