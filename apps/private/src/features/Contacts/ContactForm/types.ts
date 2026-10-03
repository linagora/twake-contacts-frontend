import { DEFAULT_ADDRESS_BOOK_ID } from '@common/features/Contacts/constants'
import {
  Contact,
  ContactSocialProfile
} from '@common/features/Contacts/contactsTypes'
import { formatAddress } from '@common/features/Contacts/contactsUtils'

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

export const orDefault = (
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
    type: entry.type ?? '',
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
          poBox: '',
          extended: '',
          street: entry.value.trim(),
          locality: '',
          region: '',
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
