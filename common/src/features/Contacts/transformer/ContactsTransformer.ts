import { DEFAULT_ADDRESS_BOOK_ID, READ_ONLY_SHARE_ACCESSES } from '../constants'
import { userData as UserDataType } from '@common/features/User/userDataTypes'
import { AddressBookAccessLevel } from '../davTypes'
import {
  AddressBook,
  Contact,
  ContactAddress,
  ContactEmail,
  ContactName,
  ContactOrg,
  ContactPhone,
  ContactSocialProfile
} from '../contactsTypes'
import {
  DavAddressBookItem,
  DavContactItem,
  JCalCard,
  JCalParams,
  JCalProperty,
  JCalValue
} from '../davTypes'

export function getCardProperty(card: JCalCard, name: string): string | null {
  const value = card[1].find(property => property[0] === name)?.[3]
  return typeof value === 'string' ? value : null
}

function getCardProperties(card: JCalCard, name: string): JCalProperty[] {
  return card[1].filter(property => property[0] === name)
}

function getStringValue(prop: JCalProperty): string | null {
  const value = prop[3]
  return typeof value === 'string' ? value : null
}

function getStringValues(prop: JCalProperty): string[] {
  const values = prop.slice(3)
  return values.filter((v): v is string => typeof v === 'string')
}

function scalarText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

// RFC 7095 §3.3.1.3: a structured component may itself be an array of values,
// only one level deep; anything else (objects, deeper nesting) is malformed
function componentText(value: unknown): string {
  if (!Array.isArray(value)) return scalarText(value)
  return value.map(scalarText).filter(Boolean).join(' ')
}

function getTypeParam(params: JCalParams): string | null {
  const type = params.type
  if (typeof type === 'string') return type
  if (Array.isArray(type) && type.length > 0) return type[0]
  return null
}

function parseName(card: JCalCard): ContactName | null {
  const prop = getCardProperties(card, 'n')[0]
  if (!prop) return null
  const values = prop[3]
  if (!Array.isArray(values)) return null
  const [familyName, givenName] = values.map(componentText)
  return {
    familyName,
    givenName
  }
}

function parseEmails(card: JCalCard): ContactEmail[] {
  return getCardProperties(card, 'email')
    .map(prop => {
      const raw = getStringValue(prop) ?? ''
      const value = raw.replace(/^mailto:/, '')
      const type = getTypeParam(prop[1])
      return { type, value }
    })
    .filter(e => e.value)
}

function parsePhones(card: JCalCard): ContactPhone[] {
  return getCardProperties(card, 'tel')
    .map(prop => {
      const raw = getStringValue(prop) ?? ''
      const value = raw.replace(/^tel:/, '')
      const type = getTypeParam(prop[1])
      return { type, value }
    })
    .filter(p => p.value)
}

const STREET_INDEX = 2

// RFC 7095 3.3.1.3 mandates an array, but some writers emit a plain string:
// keep it as the street rather than hiding it from the user.
function toAddressComponents(rawValue: unknown): unknown[] | null {
  if (Array.isArray(rawValue)) return rawValue
  if (typeof rawValue === 'string' && rawValue.trim()) {
    const components: unknown[] = []
    components[STREET_INDEX] = rawValue
    return components
  }
  return null
}

function parseAddresses(card: JCalCard): ContactAddress[] {
  return getCardProperties(card, 'adr')
    .map((prop): ContactAddress | null => {
      const values = toAddressComponents(prop[3])
      if (!values) return null
      const [poBox, extended, street, locality, region, postalCode, country] =
        Array.from({ length: 7 }, (_, i) => componentText(values[i]))
      const type = getTypeParam(prop[1])
      return {
        type,
        poBox,
        extended,
        street,
        locality,
        region,
        postalCode,
        country
      }
    })
    .filter((a): a is ContactAddress => a !== null)
}

function parseSocialProfiles(card: JCalCard): ContactSocialProfile[] {
  return getCardProperties(card, 'socialprofile')
    .map(prop => {
      const value = getStringValue(prop) ?? ''
      const type = getTypeParam(prop[1])
      return { type, value }
    })
    .filter(s => s.value)
}

function parseUrls(card: JCalCard): string[] {
  return getCardProperties(card, 'url')
    .map(prop => getStringValue(prop) ?? '')
    .filter(Boolean)
}

function parseOrg(card: JCalCard): ContactOrg | null {
  const prop = getCardProperties(card, 'org')[0]
  if (!prop) return null
  const rawValue = prop[3]
  let values: string[]
  if (Array.isArray(rawValue)) {
    values = rawValue.map(componentText)
  } else if (typeof rawValue === 'string') {
    values = [
      rawValue,
      ...prop.slice(4).filter((v): v is string => typeof v === 'string')
    ]
  } else {
    return null
  }
  if (values.length === 0) return null
  return { name: values[0], units: values.slice(1) }
}

// text-list properties (RFC 6350 NICKNAME, CATEGORIES) carry every value after the type
function parseTextList(card: JCalCard, name: string): string[] {
  const prop = getCardProperties(card, name)[0]
  if (!prop) return []
  return getStringValues(prop)
}

function extractId(href: string | undefined, extension: string): string {
  return href?.split('/').pop()?.replace(extension, '') ?? ''
}

// a sharee's copy of a book points to the original through its source
function isDefaultAddressBook(raw: DavAddressBookItem, id: string): boolean {
  const source =
    raw['{http://open-paas.org/contacts}source'] || raw['openpaas:source']
  const bookId = source ? extractId(source, '.json') : id
  return bookId === DEFAULT_ADDRESS_BOOK_ID
}

// dav:name comes as-is from the JSON payload, other clients may store a number
// an empty name is labelled by getAddressBookDisplayName
function normalizeAddressBookName(name: unknown): string {
  return typeof name === 'string' || typeof name === 'number'
    ? String(name)
    : ''
}

// The count comes from the server unchecked: anything but a non-negative integer is unknown
export function normalizeContactsCount(count: unknown): number | null {
  return Number.isInteger(count) && (count as number) >= 0
    ? (count as number)
    : null
}

export function normalizeAddressBook(raw: DavAddressBookItem): AddressBook {
  const href = raw._links?.self?.href
  const id = extractId(href, '.json')
  // href is /addressbooks/<userId>/<bookId>.json, shared books carry the owner id
  const userId = href?.split('/').at(-2) ?? ''
  const acl = raw['dav:acl'] ?? []
  // dav:acl is the book's own ACL; for a delegated book the sharee's rights are in dav:share-access
  const shareAccess = raw['dav:share-access'] ?? undefined
  const isReadOnlyShare = READ_ONLY_SHARE_ACCESSES.some(
    access => access === shareAccess
  )
  return {
    id,
    userId,
    name: normalizeAddressBookName(raw['dav:name']),
    isDefault: isDefaultAddressBook(raw, id),
    contactsCount: normalizeContactsCount(raw.numberOfContacts),
    acl,
    canWrite:
      !isReadOnlyShare &&
      acl.some(
        p =>
          p === 'dav:write' || p === '{DAV:}write-content' || p === '{DAV:}bind'
      ),
    ...(shareAccess !== undefined && { shareAccess })
  }
}

const KNOWN_PROPERTIES = new Set([
  'version',
  'uid',
  'fn',
  'n',
  'nickname',
  'bday',
  'anniversary',
  'gender',
  'email',
  'tel',
  'adr',
  'impp',
  'socialprofile',
  'url',
  'org',
  'title',
  'role',
  'categories',
  'note',
  'lang',
  'tz',
  'geo',
  'rev'
])

export function normalizeContact(item: DavContactItem): Contact {
  const id = extractId(item._links?.self?.href, '.vcf')
  const card = item.data

  const contact: Contact = {
    id,
    displayName: getCardProperty(card, 'fn') ?? id,
    emails: parseEmails(card)
  }

  const name = parseName(card)
  if (name) contact.name = name

  const nicknames = parseTextList(card, 'nickname')
  if (nicknames.some(Boolean)) contact.nicknames = nicknames

  const birthday = getCardProperty(card, 'bday')
  if (birthday) contact.birthday = birthday

  const phones = parsePhones(card)
  if (phones.length > 0) contact.phones = phones

  const addresses = parseAddresses(card)
  if (addresses.length > 0) contact.addresses = addresses

  const socialProfiles = parseSocialProfiles(card)
  if (socialProfiles.length > 0) contact.socialProfiles = socialProfiles

  const urls = parseUrls(card)
  if (urls.length > 0) contact.urls = urls

  const org = parseOrg(card)
  if (org) contact.org = org

  const title = getCardProperty(card, 'title')
  if (title) contact.title = title

  const role = getCardProperty(card, 'role')
  if (role) contact.role = role

  const categories = parseTextList(card, 'categories')
  if (categories.length > 0) contact.categories = categories

  const note = getCardProperty(card, 'note')
  if (note) contact.note = note

  const passthroughProps = card[1].filter(
    prop => !KNOWN_PROPERTIES.has(prop[0])
  )
  if (passthroughProps.length > 0) contact.passthroughProps = passthroughProps

  return contact
}

function makeTypedProperty(
  name: string,
  type: string | null,
  value: JCalValue
): JCalProperty {
  return [name, type ? { type } : {}, 'text', value]
}

/** Builds the jCal card the DAV server expects on PUT, mirroring the legacy VcardBuilder. */
export function denormalizeContact(contact: Contact): JCalCard {
  const properties: JCalProperty[] = [
    ['version', {}, 'text', '4.0'],
    ['uid', {}, 'text', contact.id],
    ['fn', {}, 'text', contact.displayName]
  ]
  if (contact.name) {
    properties.push([
      'n',
      {},
      'text',
      [contact.name.familyName, contact.name.givenName, '', '', '']
    ])
  }
  if (contact.nicknames?.length) {
    properties.push(['nickname', {}, 'text', ...contact.nicknames])
  }
  if (contact.categories?.length) {
    properties.push(['categories', {}, 'text', ...contact.categories])
  }
  contact.emails.forEach(email => {
    properties.push(makeTypedProperty('email', email.type, email.value))
  })
  contact.phones?.forEach(phone => {
    properties.push(makeTypedProperty('tel', phone.type, phone.value))
  })
  contact.addresses?.forEach(address => {
    properties.push(
      makeTypedProperty('adr', address.type, [
        address.poBox,
        address.extended,
        address.street,
        address.locality,
        address.region,
        address.postalCode,
        address.country
      ])
    )
  })
  contact.socialProfiles?.forEach(profile => {
    properties.push(
      makeTypedProperty('socialprofile', profile.type, profile.value)
    )
  })
  contact.urls?.forEach(url => {
    properties.push(['url', {}, 'uri', url])
  })
  if (contact.org) {
    properties.push([
      'org',
      {},
      'text',
      [contact.org.name, ...contact.org.units]
    ])
  }
  const singles: [string, string | undefined][] = [
    ['photo', contact.photo],
    ['bday', contact.birthday],
    ['title', contact.title],
    ['role', contact.role],
    ['note', contact.note]
  ]
  singles.forEach(([name, value]) => {
    if (value) properties.push([name, {}, 'text', value])
  })
  properties.push(...(contact.passthroughProps ?? []))
  return ['vcard', properties]
}

export const buildFullShareesList = (
  userDataId: string | undefined,
  invitedMembers: UserDataType[],
  updates: { userId: string; role: AddressBookAccessLevel; href: string }[]
): { userId: string; access: AddressBookAccessLevel; href: string }[] => {
  if (!userDataId) return []
  const shareesMap = new Map<
    string,
    { role: AddressBookAccessLevel; href: string }
  >()

  shareesMap.set(userDataId, {
    role: AddressBookAccessLevel.Owner,
    href: `principals/users/${userDataId}`
  })

  // the owner entry must never be overwritten, whatever the members or updates say
  invitedMembers
    .filter(m => m.openpaasId && m.openpaasId !== userDataId)
    .forEach(m => {
      shareesMap.set(m.openpaasId as string, {
        role: m.role ?? AddressBookAccessLevel.Viewer,
        href: m.href || `mailto:${m.email}`
      })
    })

  updates
    .filter(u => u.userId !== userDataId)
    .forEach(u => {
      shareesMap.set(u.userId, { role: u.role, href: u.href })
    })

  return Array.from(shareesMap.entries()).map(([userId, data]) => ({
    userId,
    access: data.role,
    href: data.href
  }))
}
