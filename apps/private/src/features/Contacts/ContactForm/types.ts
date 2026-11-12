import { DEFAULT_ADDRESS_BOOK_ID } from '@common/features/Contacts/constants'
import {
  Contact,
  ContactAddress,
  ContactName,
  ContactPhoneSource,
  ContactSocialProfile,
  WithParams
} from '@common/features/Contacts/contactsTypes'
import {
  formatAddress,
  hasUnchangedSource
} from '@common/features/Contacts/contactsUtils'
import {
  withoutLabel,
  withoutSortAs
} from '@common/features/Contacts/transformer/ContactsTransformer'

/** A row keeps the parameters of the property it shows, written back on save. */
export interface ContactFormEntry extends WithParams {
  type: string
  value: string
}

/** A phone row keeps its own stored TEL value, so it is never matched against another row. */
export interface PhoneFormEntry extends ContactFormEntry {
  source?: ContactPhoneSource
}

/** An address row keeps the address it was read from, so it is never matched against another row. */
export interface AddressFormEntry extends ContactFormEntry {
  source?: ContactAddress
}

export interface ContactFormValues {
  addressBookId: string
  givenName: string
  familyName: string
  categories: string[]
  matrixId: string
  phones: PhoneFormEntry[]
  emails: ContactFormEntry[]
  addresses: AddressFormEntry[]
}

export type ContactFormListKey = 'phones' | 'emails' | 'addresses'

export const PHONE_TYPES = ['cell', 'work', 'home', 'other']
export const EMAIL_TYPES = ['work', 'home', 'other']
export const ADDRESS_TYPES = ['home', 'work', 'other']

export const EMPTY_CONTACT_FORM_VALUES: ContactFormValues = {
  addressBookId: DEFAULT_ADDRESS_BOOK_ID,
  givenName: '',
  familyName: '',
  categories: [],
  matrixId: '',
  phones: [{ type: '', value: '' }],
  emails: [{ type: '', value: '' }],
  addresses: [{ type: '', value: '' }]
}

const MATRIX_TYPE = 'matrix'

export const hasValue = (entry: ContactFormEntry): boolean =>
  entry.value.trim() !== ''

export const isMatrix = (profile: ContactSocialProfile): boolean =>
  profile.type?.toLowerCase() === MATRIX_TYPE

export const orEmptyEntry = (
  entries: ContactFormEntry[]
): ContactFormEntry[] => (entries.length ? entries : [{ type: '', value: '' }])

export function makeFormValuesFromContact(
  contact: Contact,
  addressBookId: string
): ContactFormValues {
  const toEntry = (
    entry: { type: string | null; value: string } & WithParams
  ): ContactFormEntry =>
    withParams(
      { type: entry.type?.toLowerCase() ?? '', value: entry.value },
      entry.params
    )
  return {
    addressBookId,
    givenName: contact.name?.givenName ?? '',
    familyName: contact.name?.familyName ?? '',
    categories: contact.categories ?? [],
    matrixId: contact.socialProfiles?.find(isMatrix)?.value ?? '',
    phones: orEmptyEntry(
      (contact.phones ?? []).map(phone =>
        phone.source
          ? { ...toEntry(phone), source: phone.source }
          : toEntry(phone)
      )
    ),
    emails: orEmptyEntry(contact.emails.map(toEntry)),
    addresses: orEmptyEntry(
      (contact.addresses ?? []).map(address => ({
        ...toEntry({ ...address, value: formatAddress(address) }),
        source: address
      }))
    )
  }
}

/** A row read from an address and left unchanged is written back as read, with the parameters of the row. */
const toSavedAddress = (entry: AddressFormEntry): ContactAddress =>
  entry.source && formatAddress(entry.source) === entry.value
    ? { ...entry.source, type: entry.type, params: entry.params }
    : withParams(
        {
          type: entry.type,
          poBox: '',
          extended: '',
          street: entry.value.trim(),
          locality: '',
          region: '',
          postalCode: '',
          country: ''
        },
        withoutLabel(entry.params)
      )

/** Builds the contact to save. With a base contact, fields the form does not edit are kept. */
export function makeContactFromForm(
  values: ContactFormValues,
  base?: Contact
): Contact {
  const givenName = values.givenName.trim()
  const familyName = values.familyName.trim()
  const matrixId = values.matrixId.trim()
  const addresses = values.addresses.filter(hasValue).map(toSavedAddress)
  const phones = values.phones
    .filter(hasValue)
    .map(entry =>
      hasUnchangedSource(entry)
        ? entry
        : withParams({ type: entry.type, value: entry.value }, entry.params)
    )
  const name = savedName(base?.name, { givenName, familyName })
  return {
    ...base,
    id: base?.id ?? crypto.randomUUID(),
    displayName: [givenName, familyName].filter(Boolean).join(' '),
    // N components the form does not edit are kept from the base contact
    name,
    ...withNameParams(base, name !== base?.name),
    categories: values.categories,
    emails: values.emails
      .filter(hasValue)
      .map(entry => ({ ...entry, value: entry.value.trim() })),
    phones,
    addresses,
    socialProfiles: updateMatrixProfile(base?.socialProfiles ?? [], matrixId)
  }
}

function withParams<T extends object>(
  entry: T,
  params: WithParams['params']
): T & WithParams {
  return params ? { ...entry, params } : entry
}

/** The form trims the names: spaces around a name as read are not an edit. */
const isSameName = (read: ContactName, form: ContactName): boolean =>
  read.givenName.trim() === form.givenName &&
  read.familyName.trim() === form.familyName

/**
 * An unchanged name is the name as read, written back as read. A renamed one
 * keeps the other components as read.
 */
const savedName = (
  read: ContactName | undefined,
  form: ContactName
): ContactName => (read && isSameName(read, form) ? read : { ...read, ...form })

/** The parameters of the single properties, without the SORT-AS of a renamed contact. */
function withNameParams(
  base: Contact | undefined,
  renamed: boolean
): Pick<Contact, 'propertyParams'> {
  const propertyParams = base?.propertyParams
  if (!propertyParams?.n || !renamed) return {}
  const { n, ...others } = propertyParams
  const nParams = withoutSortAs(n)
  return {
    propertyParams: nParams ? { ...others, n: nParams } : others
  }
}

/**
 * Applies the form Matrix id to the first Matrix profile, the one the form shows.
 * Other profiles, including further Matrix ones, keep their type and order.
 */
function updateMatrixProfile(
  profiles: ContactSocialProfile[],
  matrixId: string
): ContactSocialProfile[] {
  const index = profiles.findIndex(isMatrix)
  if (index === -1) {
    return matrixId
      ? [...profiles, { type: MATRIX_TYPE, value: matrixId }]
      : profiles
  }
  const shown = profiles[index]
  if (!matrixId) {
    return profiles.filter((_, i) => i !== index)
  }
  if (shown.value.trim() === matrixId) {
    return profiles
  }
  return profiles.map((profile, i) =>
    i === index ? { ...profile, value: matrixId } : profile
  )
}
