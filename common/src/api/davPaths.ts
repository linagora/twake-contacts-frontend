import { encodeDavSegment } from '@linagora/twake-utils'
import { DOMAIN_ADDRESS_BOOK_ID } from '@common/features/Contacts/constants'

/**
 * The single place where the paths of esn-sabre's CardDAV resources are built.
 *
 * Every segment coming from data (user, domain, book or card id) goes through
 * encodeDavSegment, so that an id holding "/", "?", "#", "%" or a space cannot
 * change the resource the request reaches.
 *
 * Two flavours of each path:
 * - href: the path as Sabre knows it (`/addressbooks/...`), used where Sabre
 *   resolves it itself (Destination header, subscription source);
 * - path: the href behind the API proxy (`dav/addressbooks/...`), handed to ky.
 */

export interface DavBookRef {
  /** The owner of the book: a user id, or a domain id for the domain book. */
  userId: string
  /** The id of the book as the server names it, see toServerBookId. */
  bookId: string
}

const DAV_PROXY_PREFIX = 'dav'

/** The domain book is stored as dab, while Sabre lists its contacts in domain-members. */
const STORE_DOMAIN_BOOK_ID = DOMAIN_ADDRESS_BOOK_ID
const SERVER_DOMAIN_MEMBERS_ID = 'domain-members'

export function toServerBookId(bookId: string): string {
  return bookId === STORE_DOMAIN_BOOK_ID ? SERVER_DOMAIN_MEMBERS_ID : bookId
}

export function fromServerBookId(bookId: string): string {
  return bookId === SERVER_DOMAIN_MEMBERS_ID ? STORE_DOMAIN_BOOK_ID : bookId
}

const proxied = (href: string): string => `${DAV_PROXY_PREFIX}${href}`

/** `/addressbooks/<userId>/<bookId>` */
export function bookHref({ userId, bookId }: DavBookRef): string {
  return `/addressbooks/${encodeDavSegment(userId)}/${encodeDavSegment(bookId)}`
}

/** `/addressbooks/<userId>/<bookId>.json` */
export function bookJsonHref(book: DavBookRef): string {
  return `${bookHref(book)}.json`
}

/** `/addressbooks/<userId>/<bookId>/<cardId>.vcf` */
export function cardHref(book: DavBookRef, cardId: string): string {
  return `${bookHref(book)}/${encodeDavSegment(cardId)}.vcf`
}

/** `dav/addressbooks/<userId>/<bookId>` */
export function bookPath(book: DavBookRef): string {
  return proxied(bookHref(book))
}

/** `dav/addressbooks/<userId>/<bookId>.json` */
export function bookJsonPath(book: DavBookRef): string {
  return proxied(bookJsonHref(book))
}

/** `dav/addressbooks/<userId>/<bookId>/<cardId>.vcf` */
export function cardPath(book: DavBookRef, cardId: string): string {
  return proxied(cardHref(book, cardId))
}

/** `dav/addressbooks/<userId>.json`: the books of a user (home collection). */
export function userBooksPath(userId: string): string {
  return proxied(`/addressbooks/${encodeDavSegment(userId)}.json`)
}

/** `dav/contacts/<userId>.json`: the contacts of every book of a user. */
export function userContactsPath(userId: string): string {
  return proxied(`/contacts/${encodeDavSegment(userId)}.json`)
}
