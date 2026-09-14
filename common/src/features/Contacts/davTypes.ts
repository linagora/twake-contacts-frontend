/**
 * Wire format of the OpenPaaS DAV proxy JSON API (`/addressbooks/**.json`).
 *
 * Responses are HAL: `_links.self.href` carries the resource path (the only
 * place an id can be read from) and `_embedded` holds the collection.
 * Contacts themselves are jCal (RFC 7095), the JSON serialization of vCard 4.0.
 *
 * Example of one embedded contact:
 * ```json
 * {
 *   "_links": { "self": { "href": "/addressbooks/<userId>/collected/<uid>.vcf" } },
 *   "etag": "\"00000000000000000000000000000000\"",
 *   "data": ["vcard", [
 *     ["version", {}, "text", "4.0"],
 *     ["uid", {}, "text", "<uid>"],
 *     ["email", { "type": "work" }, "text", "jdoe@twake.app"],
 *     ["fn", {}, "text", "John Doe"]
 *   ]]
 * }
 * ```
 */

/** jCal property parameters, e.g. `{ type: 'work' }`. Often empty. */
export type JCalParams = Record<string, string | string[]>

/**
 * Value of a jCal property. Structured properties (`n`, `adr`) hold an array
 * of components, so a value is not always a string — narrow before using it.
 */
export type JCalValue = string | number | boolean | null | JCalValue[]

/**
 * One jCal property: `[name, params, valueType, ...values]`.
 *
 * Property order is NOT stable across cards (the server emits `fn` before
 * `uid` on some, after `email` on others), so always look properties up by
 * name — never by index.
 */
export type JCalProperty = [
  name: string,
  params: JCalParams,
  valueType: string,
  ...values: JCalValue[]
]

/** A vCard in jCal form: `['vcard', [property, ...]]`. */
export type JCalCard = ['vcard', JCalProperty[]]

interface DavSelfLink {
  self?: { href?: string }
}

/** One contact of an address book, as embedded under `dav:item`. */
export interface DavContactItem {
  /** `href` ends in `<uid>.vcf` — the contact id. */
  _links?: DavSelfLink
  etag?: string
  data: JCalCard
}

/** `GET /addressbooks/<userId>/<bookId>.json` */
export interface DavContactsResponse {
  _links?: DavSelfLink
  'dav:syncToken'?: number
  _embedded?: {
    'dav:item'?: DavContactItem[]
  }
}

/** One address book, as embedded under `dav:addressbook`. */
export interface DavAddressBookItem {
  /** `/addressbooks/<userId>/<bookId>.json`, `userId` being the owner of the book. */
  _links?: DavSelfLink
  'dav:name'?: string
  numberOfContacts?: number
  'dav:acl'?: string[]
  'dav:share-access'?: number | null
}

/** `GET /addressbooks/<userId>.json` */
export interface DavAddressBooksResponse {
  _embedded?: {
    'dav:addressbook'?: DavAddressBookItem[]
  }
}

/** `PROPFIND /addressbooks/<domainId>/dab.json` */
export interface DavAddressBookItem {
  '{DAV:}displayname'?: string
  '{DAV:}acl'?: string[]
  '{http://open-paas.org/contacts}numberOfContacts'?: number
  '{http://open-paas.org/contacts}type'?: string
  '{http://open-paas.org/contacts}state'?: string
  '{DAV:}share-access'?: number | null
}
