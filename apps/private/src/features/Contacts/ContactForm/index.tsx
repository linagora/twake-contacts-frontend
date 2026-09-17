import { Button, Menu, MenuItem, Stack } from '@linagora/twake-mui'
import {
  Icon,
  Left,
  Location,
  Plus,
  Telephone,
  Email
} from '@linagora/twake-icons'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import { AvatarHeader } from './fields/AvatarHeader'
import { NameFields } from './fields/NameFields'
import { AddressBookField } from './fields/AddressBookField'
import { MatrixIdField } from './fields/MatrixIdField'
import { EntryList } from './EntryList'
import { isValidEmail } from '@common/utils/validation'
import {
  ContactFormValues,
  ContactFormListKey,
  ContactFormEntry,
  PHONE_TYPES,
  EMAIL_TYPES,
  ADDRESS_TYPES,
  EMPTY_CONTACT_FORM_VALUES,
  makeFormValuesFromContact,
  makeContactFromForm
} from './types'

export type { ContactFormValues, ContactFormEntry }
export {
  EMPTY_CONTACT_FORM_VALUES,
  makeFormValuesFromContact,
  makeContactFromForm
}

interface ContactFormProps {
  addressBooks: AddressBook[]
  initialValues: ContactFormValues
  addressBookDisabled?: boolean
  backTo: string
  onSubmit: (values: ContactFormValues) => void | Promise<void>
  onCancel: () => void
}

export const ContactForm: React.FC<ContactFormProps> = ({
  addressBooks,
  initialValues,
  addressBookDisabled = false,
  backTo,
  onSubmit,
  onCancel
}) => {
  const { t } = useI18n()
  const [values, setValues] = useState<ContactFormValues>(initialValues)

  const displayName = [values.givenName, values.familyName]
    .filter(Boolean)
    .join(' ')

  const setField = <K extends keyof ContactFormValues>(
    key: K,
    value: ContactFormValues[K]
  ): void => {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  const updateEntry =
    (key: ContactFormListKey) =>
    (index: number, patch: Partial<ContactFormEntry>): void => {
      setField(
        key,
        values[key].map((entry, i) =>
          i === index ? { ...entry, ...patch } : entry
        )
      )
    }

  const addEntry = (key: ContactFormListKey, type: string): void => {
    setField(key, [...values[key], { type, value: '' }])
  }

  const removeEntry =
    (key: ContactFormListKey) =>
    (index: number): void => {
      setField(
        key,
        values[key].filter((_, i) => i !== index)
      )
      if (key === 'emails') {
        setTouchedEmails(prev => prev.filter((_, i) => i !== index))
      }
    }

  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [addButtonEl, setAddButtonEl] = useState<HTMLButtonElement | null>(null)
  const [touchedEmails, setTouchedEmails] = useState<boolean[]>([])

  const ADD_FIELD_MAP: Record<'phone' | 'email' | 'address', () => void> = {
    phone: () => addEntry('phones', 'cell'),
    email: () => {
      addEntry('emails', 'work')
      setTouchedEmails(prev => [...prev, false])
    },
    address: () => addEntry('addresses', 'home')
  }

  const handleAddField = (type: keyof typeof ADD_FIELD_MAP): void => {
    ADD_FIELD_MAP[type]()
    setAddMenuOpen(false)
  }

  const hasInvalidEmail = values.emails.some(
    email => email.value && !isValidEmail(email.value)
  )

  const canSubmit =
    Boolean(values.addressBookId) &&
    Boolean(values.givenName.trim() || values.familyName.trim()) &&
    !hasInvalidEmail

  return (
    <Stack spacing={3} useFlexGap>
      <Button
        component={Link}
        to={backTo}
        variant="text"
        startIcon={<Icon icon={Left} />}
      >
        {t('contacts.back')}
      </Button>

      <AvatarHeader displayName={displayName} />

      <Stack spacing={3}>
        <NameFields
          givenName={values.givenName}
          familyName={values.familyName}
          onChange={(field, value) => setField(field, value)}
        />

        <AddressBookField
          addressBooks={addressBooks}
          value={values.addressBookId}
          disabled={addressBookDisabled}
          onChange={value => setField('addressBookId', value)}
        />

        <EntryList
          icon={Telephone}
          entries={values.phones}
          types={PHONE_TYPES}
          label={t('contacts.form.phone')}
          onChange={updateEntry('phones')}
          onRemove={removeEntry('phones')}
        />

        <EntryList
          icon={Email}
          entries={values.emails}
          types={EMAIL_TYPES}
          label={t('contacts.form.email')}
          onChange={updateEntry('emails')}
          onRemove={removeEntry('emails')}
          onBlur={index => {
            setTouchedEmails(prev => {
              const next = [...prev]
              next[index] = true
              return next
            })
          }}
          showTypeSelector={false}
          validate={isValidEmail}
          validationMessage={t('contacts.form.invalidEmail')}
          touched={touchedEmails}
        />

        <MatrixIdField
          value={values.matrixId}
          onChange={value => setField('matrixId', value)}
        />

        <EntryList
          icon={Location}
          entries={values.addresses}
          types={ADDRESS_TYPES}
          label={t('contacts.form.address')}
          onChange={updateEntry('addresses')}
          onRemove={removeEntry('addresses')}
        />

        <div>
          <Button
            ref={setAddButtonEl}
            variant="text"
            startIcon={<Icon icon={Plus} />}
            onClick={() => setAddMenuOpen(true)}
          >
            {t('contacts.form.addField')}
          </Button>
          <Menu
            anchorEl={addButtonEl}
            open={addMenuOpen}
            onClose={() => setAddMenuOpen(false)}
          >
            <MenuItem onClick={() => handleAddField('phone')}>
              {t('contacts.form.addPhone')}
            </MenuItem>
            <MenuItem onClick={() => handleAddField('email')}>
              {t('contacts.form.addEmail')}
            </MenuItem>
            <MenuItem onClick={() => handleAddField('address')}>
              {t('contacts.form.addAddress')}
            </MenuItem>
          </Menu>
        </div>
      </Stack>

      <Stack direction="row" spacing={2}>
        <Button variant="outlined" onClick={onCancel}>
          {t('contacts.form.cancel')}
        </Button>
        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={() => void onSubmit(values)}
        >
          {t('contacts.form.save')}
        </Button>
      </Stack>
    </Stack>
  )
}
