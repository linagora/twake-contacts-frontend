import { DEFAULT_ADDRESS_BOOK_ID, READ_ONLY_SHARE_ACCESSES } from '../constants'
import { userData as UserDataType } from '@common/features/User/userDataTypes'
import { stripTel } from '@common/utils/normalizeIdentity'
import { safeDecodeURIComponent } from '@common/utils/safeDecodeURIComponent'
import { AddressBookAccessLevel } from '../davTypes'
import {
  Contact,
  ContactAddress,
  ContactEmail,
  ContactName,
  ContactOrg,
  ContactPhone,
  ContactSocialProfile,
  ContactUrl,
  RawAddressBook,
  SingleContactProperty,
  WithParams
} from '../contactsTypes'
import { hasUnchangedSource } from '../contactsUtils'
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

/**
 * The components as read, when one of them holds several values: what is
 * needed to write them back unchanged (see restoreComponents).
 */
function multiValuedComponents(
  values: readonly unknown[]
): { components: JCalValue[] } | Record<string, never> {
  return values.some(Array.isArray) ? { components: values as JCalValue[] } : {}
}

/**
 * Writes back as read every multi-valued component whose text was not changed,
 * so that saving does not join its values into one.
 */
function restoreComponents(
  texts: JCalValue[],
  components: JCalValue[] | undefined
): JCalValue[] {
  if (!components) return texts
  return texts.map((text, i) => {
    const source = components[i]
    return Array.isArray(source) && componentText(source) === text
      ? source
      : text
  })
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

// the parameters of a property, kept only when it has some: a malformed one is none
function readParams(prop: JCalProperty): JCalParams | undefined {
  const params: unknown = prop[1]
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return undefined
  }
  return Object.keys(params).length > 0 ? (params as JCalParams) : undefined
}

function withParams<T extends object>(
  entry: T,
  params: JCalParams | undefined
): T & WithParams {
  return params ? { ...entry, params } : entry
}

function parseUriValues(prop: JCalProperty, scheme: RegExp): ContactEmail[] {
  const type = getTypeParam(prop[1])
  const params = readParams(prop)
  return getTextValues(prop)
    .map(raw => raw.replace(scheme, ''))
    .filter(Boolean)
    .map(value => withParams({ type, value }, params))
}

function getTypeParam(params: JCalParams | undefined): string | null {
  const type = params?.type
  if (typeof type === 'string') return type
  if (Array.isArray(type) && type.length > 0) return type[0]
  return null
}

function typeTokens(type: unknown): string[] {
  if (typeof type === 'string') return [type]
  if (Array.isArray(type)) {
    return type.filter((token): token is string => typeof token === 'string')
  }
  return []
}

// the TYPE values the form chooses from: the only ones a change replaces
const FORM_TYPES = new Set(['home', 'work', 'cell', 'other'])

/**
 * Parameters to write for a typed property (RFC 6350 §5.6). An unchanged type
 * keeps the TYPE list as read; a changed one replaces only its home, work,
 * cell or other value, keeping the others (INTERNET, VOICE, FAX, pref…).
 */
export function mergeTypeParam(
  params: JCalParams | undefined,
  type: string | null
): JCalParams {
  const read = params ?? {}
  const readType = getTypeParam(read)?.toLowerCase() ?? ''
  if (readType === (type ?? '').toLowerCase()) return read
  const { type: readTokens, ...others } = read
  const kept = typeTokens(readTokens).filter(
    token => !FORM_TYPES.has(token.toLowerCase())
  )
  const tokens = type ? [type, ...kept] : kept
  if (tokens.length === 0) return others
  return { ...others, type: tokens.length === 1 ? tokens[0] : tokens }
}

function withoutParam(
  params: JCalParams | undefined,
  name: string
): JCalParams | undefined {
  if (!params || !(name in params)) return params
  const others = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== name)
  )
  return Object.keys(others).length > 0 ? others : undefined
}

/** Parameters of an edited name: its SORT-AS (RFC 6350 §5.9) no longer applies. */
export function withoutSortAs(
  params: JCalParams | undefined
): JCalParams | undefined {
  return withoutParam(params, 'sort-as')
}

/** Parameters of an edited address: its LABEL (RFC 6350 §6.3.1) no longer applies. */
export function withoutLabel(
  params: JCalParams | undefined
): JCalParams | undefined {
  return withoutParam(params, 'label')
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
    givenName,
    ...multiValuedComponents(values)
  }
}

function parseEmails(card: JCalCard): ContactEmail[] {
  return getCardProperties(card, 'email').flatMap(prop =>
    parseUriValues(prop, /^mailto:/)
  )
}

function parsePhones(card: JCalCard): ContactPhone[] {
  return getCardProperties(card, 'tel').flatMap(prop => {
    const type = getTypeParam(prop[1])
    const params = readParams(prop)
    return getTextValues(prop).flatMap((raw): ContactPhone[] => {
      // a tel: URI (vCard 4 default) is shown as its number and written back as a URI
      const value = stripTel(raw)
      if (!value) return []
      const phone: ContactPhone = withParams({ type, value }, params)
      if (raw !== value) phone.source = { valueType: prop[2], value: raw }
      return [phone]
    })
  })
}

const STREET_INDEX = 2

// RFC 7095 3.3.1.3 mandates an array, but some writers emit a plain string:
// keep it as the street rather than hiding it from the user.
function toAddressComponents(rawValue: unknown): unknown[] | null {
  if (Array.isArray(rawValue)) return rawValue as unknown[]
  if (typeof rawValue === 'string' && rawValue.trim()) {
    const components: unknown[] = []
    components[STREET_INDEX] = rawValue
    return components
  }
  return null
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
      return withParams(
        {
          type,
          poBox,
          extended,
          street,
          locality,
          region,
          postalCode,
          country,
          ...(extra.length > 0 && { extra }),
          ...multiValuedComponents(values)
        },
        readParams(prop)
      )
    })
    .filter((a): a is ContactAddress => a !== null)
}

function parseSocialProfiles(card: JCalCard): ContactSocialProfile[] {
  return getCardProperties(card, 'socialprofile')
    .map(prop => {
      const value = getStringValue(prop) ?? ''
      const type = getTypeParam(prop[1])
      return withParams({ type, value }, readParams(prop))
    })
    .filter(s => s.value)
}

function parseUrls(card: JCalCard): ContactUrl[] {
  return getCardProperties(card, 'url')
    .map(prop =>
      withParams({ value: getStringValue(prop) ?? '' }, readParams(prop))
    )
    .filter(url => url.value)
}

const SINGLE_PROPERTIES: SingleContactProperty[] = [
  'fn',
  'n',
  'nickname',
  'categories',
  'org',
  'title',
  'role',
  'note'
]

// the parameters of the first FN, N, ORG…: the one the contact shows and writes back
function parsePropertyParams(
  card: JCalCard
): Partial<Record<SingleContactProperty, JCalParams>> {
  return Object.fromEntries(
    SINGLE_PROPERTIES.flatMap(name => {
      const prop = getCardProperties(card, name)[0]
      const params = prop && readParams(prop)
      return params ? [[name, params]] : []
    })
  )
}

function parseOrg(card: JCalCard): ContactOrg | null {
  const prop = getCardProperties(card, 'org')[0]
  if (!prop) return null
  const rawValue = prop[3]
  let values: string[]
  let source = {}
  if (Array.isArray(rawValue)) {
    values = rawValue.map(componentText)
    source = multiValuedComponents(rawValue)
  } else if (typeof rawValue === 'string') {
    values = [
      rawValue,
      ...prop.slice(4).filter((v): v is string => typeof v === 'string')
    ]
  } else {
    return null
  }
  if (values.length === 0) return null
  return { name: values[0], units: values.slice(1), ...source }
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

/** Identifies the default book through its source when this is a shared copy. */
function isDefaultAddressBook(raw: DavAddressBookItem, id: string): boolean {
  const source = readAddressBookSource(raw)
  const bookId = source ? extractBookId(source) : id
  return bookId === DEFAULT_ADDRESS_BOOK_ID
}

/**
 * Decodes a segment of an href handed back by the server, so that the ids are
 * kept decoded and encoded exactly once when a DAV path is built. A segment
 * that is not a valid encoding is kept as it is.
 */
export function decodeDavSegment(segment: string): string {
  return safeDecodeURIComponent(segment)
}

function extractBookId(href: string | undefined): string {
  return decodeDavSegment(extractId(href, '.json'))
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
  const scalar: unknown =
    Array.isArray(value) && value.length === 1 ? (value[0] as unknown) : value
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

/** Converts DAV metadata into a book with decoded IDs and normalized access rights. */
export function normalizeAddressBook(raw: DavAddressBookItem): RawAddressBook {
  const href = readHref(raw._links?.self?.href)
  const id = extractBookId(href)
  // href is /addressbooks/<userId>/<bookId>.json, shared books carry the owner id
  const userId = decodeDavSegment(href?.split('/').at(-2) ?? '')
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

/** Converts a DAV card into a contact, decoding its file ID and parsing known fields. */
export function normalizeContact(item: DavContactItem): Contact {
  const id = decodeDavSegment(extractId(item._links?.self?.href, '.vcf'))
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
  if (birthday) {
    contact.birthday = birthday
    contact.birthdayProp = getCardProperties(card, 'bday')[0]
  }

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

  const propertyParams = parsePropertyParams(card)
  if (Object.keys(propertyParams).length > 0) {
    contact.propertyParams = propertyParams
  }

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
  entry: { type: string | null } & WithParams,
  value: JCalValue
): JCalProperty {
  return [name, mergeTypeParam(entry.params, entry.type), 'text', value]
}

// RFC 6350 §4.3.4 date-and-or-time, in the extended form jCard uses (RFC 7095 §3.5.3)
const DATE_AND_OR_TIME =
  /^(\d{4}(-\d{2}(-\d{2})?)?|--\d{2}(-\d{2})?|---\d{2})(T[\d:.+\-Z]*)?$|^T[\d:.+\-Z]+$/

// RFC 6350 §6.2.5: BDAY is date-and-or-time by default, text only for a free-form value
function birthdayValueType(value: string): string {
  return DATE_AND_OR_TIME.test(value) ? 'date-and-or-time' : 'text'
}

// an unchanged BDAY is written back as read, keeping its value type and parameters
function makeBirthdayProperty(
  birthday: string,
  original: JCalProperty | undefined
): JCalProperty {
  // a numeric BDAY from a non-conformant writer is shown as text: unchanged, it is kept as is
  if (original && String(original[3]) === birthday) return original
  return ['bday', {}, birthdayValueType(birthday), birthday]
}

/** Writes the stored TEL value back when the readable number was not changed. */
function makePhoneProperty(phone: ContactPhone): JCalProperty {
  const { value, source } = phone
  if (source && hasUnchangedSource(phone)) {
    return [
      'tel',
      mergeTypeParam(phone.params, phone.type),
      source.valueType,
      source.value
    ]
  }
  return makeTypedProperty('tel', phone, value)
}

// Apple and Google label a property through a companion of the same group
const GROUP_COMPANIONS = new Set(['x-ablabel', 'x-abadr'])

function groupOf(prop: JCalProperty): string | undefined {
  // a passthrough property is written back as read: its parameters may be malformed
  const group = readParams(prop)?.group
  return typeof group === 'string' ? group.toLowerCase() : undefined
}

function isGroupCompanion(prop: JCalProperty): boolean {
  return GROUP_COMPANIONS.has(prop[0].toLowerCase())
}

/** Drops the companions left without the property of their group, deleted by the user. */
function dropOrphanCompanions(properties: JCalProperty[]): JCalProperty[] {
  const carried = new Set(
    properties.filter(prop => !isGroupCompanion(prop)).map(groupOf)
  )
  return properties.filter(prop => {
    const group = groupOf(prop)
    return !isGroupCompanion(prop) || group === undefined || carried.has(group)
  })
}

/** Builds the jCal card the DAV server expects on PUT, mirroring the legacy VcardBuilder. */
export function denormalizeContact(contact: Contact): JCalCard {
  const paramsOf = (name: SingleContactProperty): JCalParams =>
    contact.propertyParams?.[name] ?? {}
  const properties: JCalProperty[] = [
    ['version', {}, 'text', '4.0'],
    // the file name only decides the URL: a card from another client keeps its own UID
    contact.uidProperty ?? ['uid', {}, 'text', contact.id],
    ['fn', paramsOf('fn'), 'text', contact.displayName]
  ]
  if (contact.name) {
    properties.push([
      'n',
      paramsOf('n'),
      'text',
      restoreComponents(
        [contact.name.familyName, contact.name.givenName, '', '', ''],
        contact.name.components
      )
    ])
  }
  if (contact.nicknames?.length) {
    properties.push([
      'nickname',
      paramsOf('nickname'),
      'text',
      ...contact.nicknames
    ])
  }
  if (contact.categories?.length) {
    properties.push([
      'categories',
      paramsOf('categories'),
      'text',
      ...contact.categories
    ])
  }
  contact.emails.forEach(email => {
    properties.push(makeTypedProperty('email', email, email.value))
  })
  contact.phones?.forEach(phone => {
    properties.push(makePhoneProperty(phone))
  })
  contact.addresses?.forEach(address => {
    properties.push(
      makeTypedProperty(
        'adr',
        address,
        restoreComponents(
          [
            address.poBox,
            address.extended,
            address.street,
            address.locality,
            address.region,
            address.postalCode,
            address.country,
            ...(address.extra ?? [])
          ],
          address.components
        )
      )
    )
  })
  contact.socialProfiles?.forEach(profile => {
    properties.push(makeTypedProperty('socialprofile', profile, profile.value))
  })
  contact.urls?.forEach(url => {
    properties.push(['url', url.params ?? {}, 'uri', url.value])
  })
  if (contact.org) {
    properties.push([
      'org',
      paramsOf('org'),
      'text',
      restoreComponents(
        [contact.org.name, ...contact.org.units],
        contact.org.components
      )
    ])
  }
  const singles: [SingleContactProperty, string | undefined][] = [
    ['title', contact.title],
    ['role', contact.role],
    ['note', contact.note]
  ]
  singles.forEach(([name, value]) => {
    if (value) properties.push([name, paramsOf(name), 'text', value])
  })
  if (contact.birthday) {
    properties.push(
      makeBirthdayProperty(contact.birthday, contact.birthdayProp)
    )
  }
  properties.push(...(contact.passthroughProps ?? []))
  return ['vcard', dropOrphanCompanions(properties)]
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
