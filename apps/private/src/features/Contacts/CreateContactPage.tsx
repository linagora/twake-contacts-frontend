import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { createContact } from '@common/features/Contacts/ContactsSlice'
import {
  selectCategories,
  selectWritableBooks
} from '@common/features/Contacts/contactsSelectors'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import {
  ContactForm,
  ContactFormValues,
  EMPTY_CONTACT_FORM_VALUES,
  makeContactFromForm
} from './ContactForm'

export const CreateContactPage: React.FC = () => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { addressBookId } = useParams()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const writableBooks = useAppSelector(selectWritableBooks)
  const categories = useAppSelector(selectCategories)

  const initialValues: ContactFormValues = {
    ...EMPTY_CONTACT_FORM_VALUES,
    addressBookId: writableBooks.some(book => book.id === addressBookId)
      ? (addressBookId ?? '')
      : (writableBooks[0]?.id ?? '')
  }

  const backTo =
    initialValues.addressBookId && initialValues.addressBookId !== 'contacts'
      ? `/contacts/${initialValues.addressBookId}`
      : '/contacts'

  const handleSubmit = async (values: ContactFormValues): Promise<void> => {
    if (!openpaasId) return
    try {
      await dispatch(
        createContact({
          userId: openpaasId,
          addressBookId: values.addressBookId,
          contact: makeContactFromForm(values)
        })
      ).unwrap()
      void navigate(
        values.addressBookId && values.addressBookId !== 'contacts'
          ? `/contacts/${values.addressBookId}`
          : '/contacts'
      )
    } catch {
      // error is surfaced by the contacts slice
    }
  }

  const handleCancel = (): void => {
    void navigate(backTo)
  }

  return (
    <ContactForm
      addressBooks={writableBooks}
      initialValues={initialValues}
      backTo={backTo}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}
