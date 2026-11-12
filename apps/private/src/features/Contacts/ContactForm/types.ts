import { DEFAULT_ADDRESS_BOOK_ID } from '@common/features/Contacts/constants'
import {
  Contact,
  ContactPhoneSource,
  ContactSocialProfile
} from '@common/features/Contacts/contactsTypes'
import {
  formatAddress,
  hasUnchangedSource
} from '@common/features/Contacts/contactsUtils'

export interface ContactFormEntry {
  type: string
  value: string
}

/** A phone row keeps its own stored TEL value, so it is never matched against another row. */
export interface PhoneFormEntry extends ContactFormEntry {
  source?: ContactPhoneSource
}

export interface ContactFormValues {
  addressBookId: string
  givenName: string
  familyName: string
  categories: string[]
  matrixId: string
  phones: PhoneFormEntry[]
  emails: ContactFormEntry[]
  addresses: ContactFormEntry[]
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
  const toEntry = (entry: {
    type: string | null
    value: string
  }): ContactFormEntry => ({
    type: entry.type?.toLowerCase() ?? '',
    value: entry.value
  })
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
        type: address.type?.toLowerCase() ?? '',
        value: formatAddress(address)
      }))
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
          poBox: '',
          extended: '',
          street: entry.value.trim(),
          locality: '',
          region: '',
          postalCode: '',
          country: ''
        }
  })
  const phones = values.phones
    .filter(hasValue)
    .map(entry =>
      hasUnchangedSource(entry)
        ? entry
        : { type: entry.type, value: entry.value }
    )
  return {
    ...base,
    id: base?.id ?? crypto.randomUUID(),
    displayName: [givenName, familyName].filter(Boolean).join(' '),
    name: { givenName, familyName },
    categories: values.categories,
    emails: values.emails
      .filter(hasValue)
      .map(entry => ({ ...entry, value: entry.value.trim() })),
    phones,
    addresses,
    socialProfiles: updateMatrixProfile(base?.socialProfiles ?? [], matrixId)
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
