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
  ContactSocialProfile,
  PhoneValueType
} from '../contactsTypes'
import {
  DavAddressBookItem,
  DavContactItem,
  DavLinks,
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

function getTextValues(prop: JCalProperty): string[] {
  return prop
    .slice(3)
    .flatMap(value =>
      typeof value === 'string' ||
      (typeof value === 'number' && Number.isFinite(value))
        ? [String(value)]
        : []
    )
}

function parseUriValues(
  prop: JCalProperty,
  scheme: RegExp
): { type: string | null; value: string }[] {
  const type = getTypeParam(prop[1])
  return getTextValues(prop)
    .map(raw => raw.replace(scheme, ''))
    .filter(Boolean)
    .map(value => ({ type, value }))
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
  const [familyName, givenName] = Array.from({ length: 2 }, (_, i) =>
    componentText(values[i])
  )
  return {
    familyName,
    givenName
  }
}

function parseEmails(card: JCalCard): ContactEmail[] {
  return getCardProperties(card, 'email').flatMap(prop =>
    parseUriValues(prop, /^mailto:/)
  )
}

const TEL_SCHEME = /^tel:/i
const TEL_URI_VALUE_TYPE: PhoneValueType = 'uri'

function parsePhones(card: JCalCard): ContactPhone[] {
  return getCardProperties(card, 'tel').flatMap(prop => {
    const type = getTypeParam(prop[1])
    return getTextValues(prop).flatMap((raw): ContactPhone[] => {
      // a tel: URI (vCard 4 default) is shown as its number and written back as a URI
      const value = raw.replace(TEL_SCHEME, '')
      if (!value) return []
      return TEL_SCHEME.test(raw)
        ? [{ type, value, valueType: TEL_URI_VALUE_TYPE }]
        : [{ type, value }]
    })
  })
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

function makePhoneProperty(phone: ContactPhone): JCalProperty {
  return phone.valueType === TEL_URI_VALUE_TYPE
    ? [
        'tel',
        phone.type ? { type: phone.type } : {},
        'uri',
        `tel:${phone.value}`
      ]
    : makeTypedProperty('tel', phone.type, phone.value)
}

// RFC 6350 §6.3.1 defines seven ADR components, RFC 9554 appends more after them
const RFC6350_ADR_COMPONENTS = 7

function parseAddresses(card: JCalCard): ContactAddress[] {
  return getCardProperties(card, 'adr')
    .map((prop): ContactAddress | null => {
      const values = toAddressComponents(prop[3])
      if (!values) return null
      const [poBox, extended, street, locality, region, postalCode, country] =
        Array.from({ length: RFC6350_ADR_COMPONENTS }, (_, i) =>
          componentText(values[i])
        )
      const extra = values.slice(RFC6350_ADR_COMPONENTS).map(componentText)
      const type = getTypeParam(prop[1])
      return {
        type,
        poBox,
        extended,
        street,
        locality,
        region,
        postalCode,
        country,
        ...(extra.length > 0 && { extra })
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

// RFC 7095 sends a date as a string, non-conformant writers may store a number
function parseBirthday(card: JCalCard): string | null {
  const value = getCardProperties(card, 'bday')[0]?.[3]
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : null
}

// text-list properties (RFC 6350 NICKNAME, CATEGORIES) carry every value after the type
function parseTextList(card: JCalCard, name: string): string[] {
  const prop = getCardProperties(card, name)[0]
  if (!prop) return []
  return getStringValues(prop)
}

// hrefs come as-is from the JSON payload, anything but a string is a missing one
export function readHref(href: unknown): string | undefined {
  return typeof href === 'string' ? href : undefined
}

function extractId(href: unknown, extension: string): string {
  return readHref(href)?.split('/').pop()?.replace(extension, '') ?? ''
}

// The href carries the card file name percent-encoded: the contact id is the
// decoded name, as given back by the route params and encoded again in DAV requests
function decodeId(id: string): string {
  try {
    return decodeURIComponent(id)
  } catch {
    return id
  }
}

// a sharee's copy of a book points to the original through its source:
// a book path, or the HAL object subscribeToAddressBook posts
export function readAddressBookSource(
  raw: DavAddressBookItem
): string | undefined {
  const source =
    raw['{http://open-paas.org/contacts}source'] || raw['openpaas:source']
  if (typeof source === 'string') return source
  const links = (source as { _links?: DavLinks } | null | undefined)?._links
  return readHref(links?.self?.href)
}

function isDefaultAddressBook(raw: DavAddressBookItem, id: string): boolean {
  const source = readAddressBookSource(raw)
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

// dav:share-access is a JSON number from esn-sabre, but may come as a numeric
// string or a single-element array; anything else is treated as absent
function normalizeShareAccess(value: unknown): number | undefined {
  const scalar = Array.isArray(value) && value.length === 1 ? value[0] : value
  if (typeof scalar === 'number') {
    return Number.isInteger(scalar) ? scalar : undefined
  }
  if (typeof scalar === 'string' && scalar.trim() !== '') {
    const parsed = Number(scalar)
    return Number.isInteger(parsed) ? parsed : undefined
  }
  return undefined
}

// dav:acl comes as-is from the JSON payload, a malformed answer may not be a string array
function normalizeAcl(acl: unknown): string[] {
  return Array.isArray(acl)
    ? acl.filter(
        (privilege): privilege is string => typeof privilege === 'string'
      )
    : []
}

export function normalizeAddressBook(raw: DavAddressBookItem): AddressBook {
  const href = readHref(raw._links?.self?.href)
  const id = extractId(href, '.json')
  // href is /addressbooks/<userId>/<bookId>.json, shared books carry the owner id
  const userId = href?.split('/').at(-2) ?? ''
  const acl = normalizeAcl(raw['dav:acl'])
  // dav:acl is the book's own ACL; for a delegated book the sharee's rights are in dav:share-access
  const shareAccess = normalizeShareAccess(raw['dav:share-access'])
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
  const id = decodeId(extractId(item._links?.self?.href, '.vcf'))
  const card = item.data

  const contact: Contact = {
    id,
    displayName: getCardProperty(card, 'fn') ?? id,
    emails: parseEmails(card)
  }

  const uidProperty = getCardProperties(card, 'uid')[0]
  if (uidProperty) contact.uidProperty = uidProperty

  const name = parseName(card)
  if (name) contact.name = name

  const nicknames = parseTextList(card, 'nickname')
  if (nicknames.some(Boolean)) contact.nicknames = nicknames

  const birthday = parseBirthday(card)
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

  // an unreadable bday is kept as-is so that saving does not lose it
  const passthroughProps = card[1].filter(
    prop =>
      !KNOWN_PROPERTIES.has(prop[0]) ||
      (prop[0] === 'bday' && !contact.birthday)
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
    // the file name only decides the URL: a card from another client keeps its own UID
    contact.uidProperty ?? ['uid', {}, 'text', contact.id],
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
    properties.push(makePhoneProperty(phone))
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
        address.country,
        ...(address.extra ?? [])
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
