import {
  Autocomplete,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  ListItem,
  MenuItem,
  Stack,
  TextField
} from '@linagora/twake-mui'
import {
  Contacts,
  Cross,
  Email,
  Icon,
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
import { useState } from 'react'
import { useI18n } from 'twake-i18n'

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
  const toEntry = (entry: { type: string | null; value: string }) => ({
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

interface ContactFormDialogProps {
  title: string
  addressBooks: AddressBook[]
  categoryOptions: string[]
  initialValues?: ContactFormValues
  onClose: () => void
  onSubmit: (values: ContactFormValues) => void
}

interface FieldRowProps {
  icon: React.ComponentType
  children: React.ReactNode
}

const FieldRow: React.FC<FieldRowProps> = ({ icon, children }) => (
  <Grid container spacing={1} wrap="nowrap">
    <Grid>
      <Icon icon={icon} />
    </Grid>
    <Grid size="grow">{children}</Grid>
  </Grid>
)

interface EntryListProps {
  icon: React.ComponentType
  entries: ContactFormEntry[]
  types: string[]
  placeholder: string
  addLabel: string
  onChange: (index: number, patch: Partial<ContactFormEntry>) => void
  onAdd: () => void
}

const EntryList: React.FC<EntryListProps> = ({
  icon,
  entries,
  types,
  placeholder,
  addLabel,
  onChange,
  onAdd
}) => {
  const { t } = useI18n()
  return (
    <FieldRow icon={icon}>
      <Stack spacing={1}>
        {entries.map((entry, index) => (
          <Grid key={index} container spacing={2}>
            <Grid size={8}>
              <TextField
                fullWidth
                variant="standard"
                placeholder={placeholder}
                value={entry.value}
                onChange={e => onChange(index, { value: e.target.value })}
                slotProps={{ htmlInput: { 'aria-label': placeholder } }}
              />
            </Grid>
            <Grid size={4}>
              <TextField
                select
                fullWidth
                variant="standard"
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
          </Grid>
        ))}
        <div>
          <Button
            variant="text"
            startIcon={<Icon icon={Plus} />}
            onClick={onAdd}
          >
            {addLabel}
          </Button>
        </div>
      </Stack>
    </FieldRow>
  )
}

export const ContactFormDialog: React.FC<ContactFormDialogProps> = ({
  title,
  addressBooks,
  categoryOptions,
  initialValues = EMPTY_CONTACT_FORM_VALUES,
  onClose,
  onSubmit
}) => {
  const { t } = useI18n()
  const [values, setValues] = useState<ContactFormValues>(() => ({
    ...initialValues,
    addressBookId: initialValues.addressBookId || (addressBooks[0]?.id ?? '')
  }))

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

  const addEntry = (key: ContactFormListKey, type: string) => (): void => {
    setField(key, [...values[key], { type, value: '' }])
  }

  const handleSubmit = (): void => {
    onSubmit(values)
  }

  const canSubmit =
    Boolean(values.addressBookId) &&
    Boolean(values.givenName.trim() || values.familyName.trim())

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <ListItem
          disableGutters
          disablePadding
          secondaryAction={
            <IconButton
              edge="end"
              aria-label={t('contacts.form.close')}
              onClick={onClose}
            >
              <Icon icon={Cross} />
            </IconButton>
          }
        >
          {title}
        </ListItem>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <FieldRow icon={People}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={3}>
                <TextField
                  fullWidth
                  variant="standard"
                  placeholder={t('contacts.form.firstName')}
                  value={values.givenName}
                  onChange={e => setField('givenName', e.target.value)}
                  slotProps={{
                    htmlInput: { 'aria-label': t('contacts.form.firstName') }
                  }}
                />
                <TextField
                  fullWidth
                  variant="standard"
                  placeholder={t('contacts.form.lastName')}
                  value={values.familyName}
                  onChange={e => setField('familyName', e.target.value)}
                  slotProps={{
                    htmlInput: { 'aria-label': t('contacts.form.lastName') }
                  }}
                />
              </Stack>
              <Autocomplete
                multiple
                freeSolo
                options={categoryOptions}
                value={values.categories}
                onChange={(_e, categories) =>
                  setField('categories', categories)
                }
                renderValue={(selected, getItemProps) =>
                  selected.map((category, index) => {
                    const { key, ...itemProps } = getItemProps({ index })
                    return (
                      <Chip
                        key={key}
                        label={category}
                        size="small"
                        square
                        {...itemProps}
                      />
                    )
                  })
                }
                renderInput={params => (
                  <TextField
                    {...params}
                    variant="standard"
                    placeholder={t('contacts.form.addTeam')}
                    slotProps={{
                      ...params.slotProps,
                      htmlInput: {
                        ...params.slotProps.htmlInput,
                        'aria-label': t('contacts.form.addTeam')
                      }
                    }}
                  />
                )}
              />
            </Stack>
          </FieldRow>
          <FieldRow icon={Contacts}>
            <TextField
              select
              fullWidth
              variant="standard"
              value={values.addressBookId}
              onChange={e => setField('addressBookId', e.target.value)}
              slotProps={{
                select: { 'aria-label': t('contacts.form.addressBook') }
              }}
            >
              {addressBooks.map(book => (
                <MenuItem key={book.id} value={book.id}>
                  {getAddressBookDisplayName(book, t) ||
                    t('contacts.myContacts')}
                </MenuItem>
              ))}
            </TextField>
          </FieldRow>
          <FieldRow icon={Matrix}>
            <TextField
              fullWidth
              variant="standard"
              placeholder={t('contacts.form.matrixId')}
              value={values.matrixId}
              onChange={e => setField('matrixId', e.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': t('contacts.form.matrixId') }
              }}
            />
          </FieldRow>
          <EntryList
            icon={Phone}
            entries={values.phones}
            types={PHONE_TYPES}
            placeholder={t('contacts.form.phone')}
            addLabel={t('contacts.form.addPhone')}
            onChange={updateEntry('phones')}
            onAdd={addEntry('phones', 'cell')}
          />
          <EntryList
            icon={Email}
            entries={values.emails}
            types={EMAIL_TYPES}
            placeholder={t('contacts.form.email')}
            addLabel={t('contacts.form.addEmail')}
            onChange={updateEntry('emails')}
            onAdd={addEntry('emails', 'work')}
          />
          <EntryList
            icon={Location}
            entries={values.addresses}
            types={ADDRESS_TYPES}
            placeholder={t('contacts.form.address')}
            addLabel={t('contacts.form.addAddress')}
            onChange={updateEntry('addresses')}
            onAdd={addEntry('addresses', 'home')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          {t('contacts.form.cancel')}
        </Button>
        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {t('contacts.form.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
