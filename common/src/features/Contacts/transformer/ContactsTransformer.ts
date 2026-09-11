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
  const [familyName, givenName] = values.map(v => String(v ?? ''))
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

function parseAddresses(card: JCalCard): ContactAddress[] {
  return getCardProperties(card, 'adr')
    .map((prop): ContactAddress | null => {
      const values = prop[3]
      if (!Array.isArray(values)) return null
      const [street, locality, address, postalCode, country] = values.map(v =>
        String(v ?? '')
      )
      const type = getTypeParam(prop[1])
      return {
        type,
        street,
        locality,
        postalCode,
        country,
        address
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
    values = rawValue.map(v => String(v ?? ''))
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

function parseCategories(card: JCalCard): string[] {
  const prop = getCardProperties(card, 'categories')[0]
  if (!prop) return []
  return getStringValues(prop)
}

function extractId(href: string | undefined, extension: string): string {
  return href?.split('/').pop()?.replace(extension, '') ?? ''
}

export function normalizeAddressBook(raw: DavAddressBookItem): AddressBook {
  const href = raw._links?.self?.href
  const id = extractId(href, '.json')
  // href is /addressbooks/<userId>/<bookId>.json, shared books carry the owner id
  const userId = href?.split('/').at(-2) ?? ''
  return {
    id,
    userId,
    name: raw['dav:name'] ?? id,
    contactsCount: raw.numberOfContacts ?? 0
  }
}

const KNOWN_PROPERTIES = new Set([
  'version',
  'uid',
  'fn',
  'n',
  'nickname',
  'photo',
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

  const nickname = getCardProperty(card, 'nickname')
  if (nickname) contact.nickname = nickname

  const photo = getCardProperty(card, 'photo')
  if (photo) contact.photo = photo

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

  const categories = parseCategories(card)
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
  if (contact.categories?.length) {
    properties.push(['categories', {}, 'text', ...contact.categories])
  }
  contact.emails.forEach(email => {
    properties.push(
      makeTypedProperty('email', email.type, `mailto:${email.value}`)
    )
  })
  contact.phones?.forEach(phone => {
    properties.push(makeTypedProperty('tel', phone.type, phone.value))
  })
  contact.addresses?.forEach(address => {
    properties.push(
      makeTypedProperty('adr', address.type, [
        '',
        '',
        address.street,
        address.locality,
        '',
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
  return ['vcard', properties]
}
