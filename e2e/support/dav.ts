import { randomUUID } from 'node:crypto'

import { stack } from './env'
import type { E2EUser } from './users'

/** What Sabre's admin impersonation needs (SABRE_ADMIN_* of the calendar e2e compose file) */
const SABRE_ADMIN_LOGIN = 'admin'
const SABRE_ADMIN_PASSWORD = 'secret123'

/**
 * `dav:share-access` of a sharee: 2 read only ("Viewer"), 3 read-write (sabre/dav
 * ACCESS_READWRITE, "Read & write", granted by other clients), 5 administration ("Editor", what
 * the app grants: read-write and may share)
 */
export type ShareAccess = 2 | 3 | 5

export const READ_ONLY: ShareAccess = 2
export const READ_WRITE: ShareAccess = 3
export const EDITOR: ShareAccess = 5

export interface TypedValue {
  value: string
  /** vCard TYPE parameter, as the app writes it (`cell`, `work`, `home`, `other`) */
  type?: string
}

export interface ContactSeed {
  /** UID of the vCard, and the `<contactId>` of its URL; random by default */
  uid?: string
  firstName?: string
  lastName?: string
  emails?: (string | TypedValue)[]
  phones?: (string | TypedValue)[]
  /** Free form street, as the app writes an address typed in its form */
  addresses?: (string | TypedValue)[]
  matrixId?: string
  categories?: string[]
  org?: string
}

export interface AddressBookSeed {
  /** Readable id of the book, its `<bookId>` in the URL; random by default */
  id?: string
  name: string
  /** `['dav:read', 'dav:write']` by default, as the app creates its books */
  acl?: string[]
}

/** An address book as listed by `GET /addressbooks/<userId>.json` */
export interface ListedAddressBook {
  id: string
  name: string
  /** `/addressbooks/<ownerId>/<bookId>.json` of the original, for a share or a subscription */
  source: string | null
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function typed(entry: string | TypedValue): TypedValue {
  return typeof entry === 'string' ? { value: entry } : entry
}

function property(name: string, entry: TypedValue, value: string): string {
  return entry.type === undefined
    ? `${name}:${value}`
    : `${name};TYPE=${entry.type}:${value}`
}

/** A vCard 3.0, as the import and the app both accept it */
export function toVCard(seed: ContactSeed & { uid: string }): string {
  const firstName = seed.firstName ?? ''
  const lastName = seed.lastName ?? ''
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `UID:${seed.uid}`,
    `FN:${escapeText([firstName, lastName].filter(Boolean).join(' '))}`,
    `N:${escapeText(lastName)};${escapeText(firstName)};;;`,
    ...(seed.emails ?? []).map(typed).map(e => property('EMAIL', e, e.value)),
    ...(seed.phones ?? []).map(typed).map(p => property('TEL', p, p.value)),
    ...(seed.addresses ?? [])
      .map(typed)
      .map(a => property('ADR', a, `;;${escapeText(a.value)};;;;`)),
    ...(seed.matrixId === undefined
      ? []
      : [`SOCIALPROFILE;TYPE=matrix:${seed.matrixId}`]),
    ...(seed.categories === undefined
      ? []
      : [`CATEGORIES:${seed.categories.map(escapeText).join(',')}`]),
    ...(seed.org === undefined ? [] : [`ORG:${escapeText(seed.org)}`]),
    'END:VCARD'
  ]
  return `${lines.join('\r\n')}\r\n`
}

/**
 * CardDAV provisioning client of one user. It talks to Sabre directly, with the admin
 * impersonation credentials, which sidesteps OIDC (CalendarProbe.java of the calendar e2e
 * suite does the same): a test seeds its address books and contacts in a few milliseconds
 * instead of clicking through the app, and checks the backend when the screen could lie.
 */
export class DavClient {
  readonly user: E2EUser

  constructor(user: E2EUser) {
    this.user = user
  }

  static forUser(user: E2EUser): DavClient {
    return new DavClient(user)
  }

  async request(
    method: string,
    path: string,
    init: { body?: string; contentType?: string; accept?: string } = {}
  ): Promise<Response> {
    const credentials = `${SABRE_ADMIN_LOGIN}&${this.user.email}:${SABRE_ADMIN_PASSWORD}`
    const headers: Record<string, string> = {
      Authorization: `Basic ${Buffer.from(credentials).toString('base64')}`,
      Accept: init.accept ?? 'application/json'
    }
    if (init.contentType !== undefined) {
      headers['Content-Type'] = init.contentType
    }
    return fetch(`http://${stack().sabre}${path}`, {
      method,
      headers,
      body: init.body
    })
  }

  async #expect(
    response: Response,
    statuses: number[],
    what: string
  ): Promise<void> {
    if (!statuses.includes(response.status)) {
      throw new Error(
        `${what} as ${this.user.email}: ${response.status} ${await response.text()}`
      )
    }
  }

  /** Creates an address book of the user and returns its id */
  async createAddressBook(seed: AddressBookSeed): Promise<string> {
    const id = seed.id ?? randomUUID()
    const response = await this.request(
      'POST',
      `/addressbooks/${this.user.id}.json`,
      {
        contentType: 'application/json',
        body: JSON.stringify({
          id,
          'dav:name': seed.name,
          'carddav:description': '',
          'dav:acl': seed.acl ?? ['dav:read', 'dav:write'],
          type: 'user'
        })
      }
    )
    await this.#expect(response, [201], `Creating the address book ${id}`)
    return id
  }

  /** The address books the user sees: own, shared with them, subscribed */
  async listAddressBooks(): Promise<ListedAddressBook[]> {
    const response = await this.request(
      'GET',
      `/addressbooks/${this.user.id}.json?personal=true&shared=true&subscribed=true&inviteStatus=2`
    )
    await this.#expect(response, [200], 'Listing the address books')
    const body = (await response.json()) as {
      _embedded?: { 'dav:addressbook'?: Record<string, unknown>[] }
    }
    return (body._embedded?.['dav:addressbook'] ?? []).map(book => {
      const href = (book._links as { self?: { href?: string } } | undefined)
        ?.self?.href
      const source =
        book['{http://open-paas.org/contacts}source'] ?? book['openpaas:source']
      return {
        id:
          (href ?? '')
            .split('/')
            .pop()
            ?.replace(/\.json$/, '') ?? '',
        name: typeof book['dav:name'] === 'string' ? book['dav:name'] : '',
        source: typeof source === 'string' ? source : null
      }
    })
  }

  /** The ids of the books of the user that are public, as other users search them */
  async publicAddressBookIds(): Promise<string[]> {
    const response = await this.request(
      'GET',
      `/addressbooks/${this.user.id}.json?public=true`
    )
    await this.#expect(response, [200], 'Listing the public address books')
    const body = (await response.json()) as {
      _embedded?: {
        'dav:addressbook'?: { _links?: { self?: { href?: string } } }[]
      }
    }
    return (body._embedded?.['dav:addressbook'] ?? []).map(
      book =>
        (book._links?.self?.href ?? '')
          .split('/')
          .pop()
          ?.replace(/\.json$/, '') ?? ''
    )
  }

  /**
   * The id under which the user sees an address book shared with them by `owner`: a share is
   * a copy with a generated id, `/contacts/<that id>` in the app.
   */
  async sharedCopyOf(owner: E2EUser, bookId: string): Promise<string> {
    const wanted = `/addressbooks/${owner.id}/${bookId}.json`
    const copy = (await this.listAddressBooks()).find(
      book => book.source === wanted
    )
    if (copy === undefined) {
      throw new Error(`${this.user.email} has no copy of ${wanted}`)
    }
    return copy.id
  }

  /** Writes a contact into a book of the user (default book: `contacts`); returns its UID */
  async putContact(bookId: string, seed: ContactSeed): Promise<string> {
    const uid = seed.uid ?? randomUUID()
    const response = await this.request(
      'PUT',
      `/addressbooks/${this.user.id}/${bookId}/${encodeURIComponent(uid)}.vcf`,
      { contentType: 'text/vcard', body: toVCard({ ...seed, uid }) }
    )
    await this.#expect(response, [201, 204], `Writing the contact ${uid}`)
    return uid
  }

  /** The vCard of a contact, or null when it does not exist */
  async getContact(bookId: string, uid: string): Promise<string | null> {
    const response = await this.request(
      'GET',
      `/addressbooks/${this.user.id}/${bookId}/${encodeURIComponent(uid)}.vcf`,
      { accept: 'text/vcard' }
    )
    if (response.status === 404) return null
    await this.#expect(response, [200], `Reading the contact ${uid}`)
    return response.text()
  }

  /** The full names (FN) of the contacts of a book */
  async contactNames(bookId: string): Promise<string[]> {
    const response = await this.request(
      'GET',
      `/addressbooks/${this.user.id}/${bookId}.json?limit=500&offset=0`,
      { accept: 'application/vcard+json' }
    )
    await this.#expect(response, [200], `Listing the contacts of ${bookId}`)
    const body = (await response.json()) as {
      _embedded?: { 'dav:item'?: { data?: unknown }[] }
    }
    return (body._embedded?.['dav:item'] ?? []).map(item => {
      const properties = Array.isArray(item.data) ? item.data[1] : []
      const fn = (properties as unknown[][]).find(p => p[0] === 'fn')
      return typeof fn?.[3] === 'string' ? fn[3] : ''
    })
  }

  /** Shares a book of the user with another user */
  async share(
    bookId: string,
    sharee: E2EUser,
    access: ShareAccess
  ): Promise<void> {
    const response = await this.request(
      'POST',
      `/addressbooks/${this.user.id}/${bookId}.json`,
      {
        contentType: 'application/json',
        body: JSON.stringify({
          'dav:share-resource': {
            'dav:sharee': [
              {
                'dav:href': `mailto:${sharee.email}`,
                'dav:share-access': access
              }
            ]
          }
        })
      }
    )
    await this.#expect(response, [200, 204], `Sharing ${bookId}`)
  }

  /** Makes a book public, so that other users can add it ("Add a shared address book") */
  async publish(
    bookId: string,
    privilege: '{DAV:}read' | '{DAV:}write' = '{DAV:}read'
  ): Promise<void> {
    const response = await this.request(
      'POST',
      `/addressbooks/${this.user.id}/${bookId}.json`,
      {
        contentType: 'application/json',
        body: JSON.stringify({ 'dav:publish-addressbook': { privilege } })
      }
    )
    await this.#expect(response, [200, 204], `Publishing ${bookId}`)
  }
}

/** The default address book of every user, labelled "My contacts" and hidden from the sidebar */
export const DEFAULT_BOOK = 'contacts'
