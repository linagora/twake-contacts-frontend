import {
  Button,
  Grid,
  MenuItem,
  Menu,
  Stack,
  TextField,
  Typography,
  Avatar
} from '@linagora/twake-mui'
import {
  Cross,
  Email,
  Icon,
  Left,
  Location,
  Matrix,
  People,
  Phone,
  Plus
} from '@linagora/twake-icons'
import {
  AddressBook,
  Contact,
  ContactAddress,
  ContactSocialProfile
} from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import { getInitials } from './getInitials'

export interface ContactFormEntry {
  type: string
  value: string
}

export interface ContactFormValues {
  addressBookId: string
  givenName: string
  familyName: string
  categories: string[]
  matrixId: string
  phones: ContactFormEntry[]
  emails: ContactFormEntry[]
  addresses: ContactFormEntry[]
}

type ContactFormListKey = 'phones' | 'emails' | 'addresses'

const PHONE_TYPES = ['cell', 'work', 'home', 'other']
const EMAIL_TYPES = ['work', 'home', 'other']
const ADDRESS_TYPES = ['home', 'work', 'other']

export const EMPTY_CONTACT_FORM_VALUES: ContactFormValues = {
  addressBookId: '',
  givenName: '',
  familyName: '',
  categories: [],
  matrixId: '',
  phones: [{ type: 'cell', value: '' }],
  emails: [{ type: 'work', value: '' }],
  addresses: [{ type: 'home', value: '' }]
}

const MATRIX_TYPE = 'matrix'

const hasValue = (entry: ContactFormEntry): boolean => entry.value.trim() !== ''

const isMatrix = (profile: ContactSocialProfile): boolean =>
  profile.type?.toLowerCase() === MATRIX_TYPE

const formatAddress = (address: ContactAddress): string =>
  [address.street, address.postalCode, address.locality, address.country]
    .filter(Boolean)
    .join(', ')

const orDefault = (
  entries: ContactFormEntry[],
  type: string
): ContactFormEntry[] => (entries.length ? entries : [{ type, value: '' }])

export function makeFormValuesFromContact(
  contact: Contact,
  addressBookId: string
): ContactFormValues {
  const toEntry = (entry: {
    type: string | null
    value: string
  }): ContactFormEntry => ({
    type: entry.type ?? 'other',
    value: entry.value
  })
  return {
    addressBookId,
    givenName: contact.name?.givenName ?? '',
    familyName: contact.name?.familyName ?? '',
    categories: contact.categories ?? [],
    matrixId: contact.socialProfiles?.find(isMatrix)?.value ?? '',
    phones: orDefault((contact.phones ?? []).map(toEntry), 'cell'),
    emails: orDefault(contact.emails.map(toEntry), 'work'),
    addresses: orDefault(
      (contact.addresses ?? []).map(address => ({
        type: address.type ?? 'other',
        value: formatAddress(address)
      })),
      'home'
    )
  }
}

/** Builds the contact to save. With a base contact, fields the form does not edit are kept. */
export function makeContactFromForm(
  values: ContactFormValues,
  base?: Contact
): Contact {
  const givenName = values.givenName.trim()
  const familyName = values.familyName.trim()
  const matrixId = values.matrixId.trim()
  const addresses = values.addresses.filter(hasValue).map((entry, index) => {
    const original = base?.addresses?.[index]
    const untouched = original && formatAddress(original) === entry.value
    return untouched
      ? { ...original, type: entry.type }
      : {
          type: entry.type,
          address: '',
          street: entry.value.trim(),
          locality: '',
          postalCode: '',
          country: ''
        }
  })
  const otherProfiles = (base?.socialProfiles ?? []).filter(p => !isMatrix(p))
  return {
    ...base,
    id: base?.id ?? crypto.randomUUID(),
    displayName: [givenName, familyName].filter(Boolean).join(' '),
    name: { givenName, familyName },
    categories: values.categories,
    emails: values.emails.filter(hasValue),
    phones: values.phones.filter(hasValue),
    addresses,
    socialProfiles: matrixId
      ? [...otherProfiles, { type: MATRIX_TYPE, value: matrixId }]
      : otherProfiles
  }
}

interface FormRowProps {
  children: React.ReactNode
}

const FormRow: React.FC<FormRowProps> = ({ children }) => (
  <Grid container spacing={2}>
    {children}
  </Grid>
)

interface EntryListProps {
  icon: React.ComponentType
  entries: ContactFormEntry[]
  types: string[]
  label: string
  onChange: (index: number, patch: Partial<ContactFormEntry>) => void
  onRemove: (index: number) => void
  showTypeSelector?: boolean
}

const EntryList: React.FC<EntryListProps> = ({
  icon,
  entries,
  types,
  label,
  onChange,
  onRemove,
  showTypeSelector = true
}) => {
  const { t } = useI18n()
  if (entries.length === 0) return null
  return (
    <Stack spacing={1}>
      {entries.map((entry, index) => (
        <FormRow key={index}>
          <Grid size={showTypeSelector ? 6 : 8}>
            <TextField
              fullWidth
              variant="outlined"
              label={label}
              value={entry.value}
              onChange={e => onChange(index, { value: e.target.value })}
              slotProps={{
                htmlInput: { 'aria-label': label },
                input: {
                  startAdornment: <Icon icon={icon} />
                }
              }}
            />
          </Grid>
          {showTypeSelector && (
            <Grid size={2}>
              <TextField
                select
                fullWidth
                variant="outlined"
                value={entry.type}
                onChange={e => onChange(index, { type: e.target.value })}
                slotProps={{
                  select: { 'aria-label': t('contacts.form.type') }
                }}
              >
                {types.map(type => (
                  <MenuItem key={type} value={type}>
                    {t(`contacts.types.${type}`)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          <Grid size={1}>
            {index > 0 && (
              <Button
                variant="text"
                onClick={() => onRemove(index)}
                aria-label={t('contacts.form.remove')}
              >
                <Icon icon={Cross} />
              </Button>
            )}
          </Grid>
        </FormRow>
      ))}
    </Stack>
  )
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
    }

  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const addButtonRef = useRef<HTMLButtonElement>(null)

  const handleAddField = (type: 'phone' | 'email' | 'address'): void => {
    if (type === 'phone') addEntry('phones', 'cell')
    else if (type === 'email') addEntry('emails', 'work')
    else if (type === 'address') addEntry('addresses', 'home')
    setAddMenuOpen(false)
  }

  const canSubmit =
    Boolean(values.addressBookId) &&
    Boolean(values.givenName.trim() || values.familyName.trim())

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

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Grid>
          <Avatar size="xl">{getInitials(displayName)}</Avatar>
        </Grid>
        <Grid>
          <Typography variant="h4">
            {displayName || t('contacts.form.newContact')}
          </Typography>
        </Grid>
      </Stack>

      <Stack spacing={3}>
        <FormRow>
          <Grid size={4}>
            <TextField
              fullWidth
              variant="outlined"
              label={t('contacts.form.firstName')}
              value={values.givenName}
              onChange={e => setField('givenName', e.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': t('contacts.form.firstName') }
              }}
            />
          </Grid>
          <Grid size={4}>
            <TextField
              fullWidth
              variant="outlined"
              label={t('contacts.form.lastName')}
              value={values.familyName}
              onChange={e => setField('familyName', e.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': t('contacts.form.lastName') }
              }}
            />
          </Grid>
        </FormRow>

        <FormRow>
          <Grid size={8}>
            <TextField
              select
              fullWidth
              variant="outlined"
              disabled={addressBookDisabled}
              value={values.addressBookId}
              onChange={e => setField('addressBookId', e.target.value)}
              slotProps={{
                select: { 'aria-label': t('contacts.form.addressBook') },
                input: { startAdornment: <Icon icon={People} /> }
              }}
            >
              {addressBooks.map(book => (
                <MenuItem key={book.id} value={book.id}>
                  {getAddressBookDisplayName(book, t) ||
                    t('contacts.myContacts')}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </FormRow>

        <EntryList
          icon={Phone}
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
          showTypeSelector={false}
        />

        <FormRow>
          <Grid size={8}>
            <TextField
              fullWidth
              variant="outlined"
              label={t('contacts.form.matrixId')}
              value={values.matrixId}
              onChange={e => setField('matrixId', e.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': t('contacts.form.matrixId') },
                input: { startAdornment: <Icon icon={Matrix} /> }
              }}
            />
          </Grid>
        </FormRow>

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
            ref={addButtonRef}
            variant="text"
            startIcon={<Icon icon={Plus} />}
            onClick={() => setAddMenuOpen(true)}
          >
            {t('contacts.form.addField')}
          </Button>
          <Menu
            anchorEl={addButtonRef.current}
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
