import { safeDecodeURIComponent } from '@common/utils/safeDecodeURIComponent'
import { useParams } from 'react-router'

// IDs are stored decoded. React Router decodes each route segment, then turns
// every `%2F` of a param into `/`, so a literal `%2F` in an ID could not be
// told from an encoded `/`. Each segment is thus encoded with its `%` escaped
// once more: once React Router has decoded the segment, the param still holds
// the ID percent-encoded, and `decodeRouteParam` gives the ID back.
const encodeRouteSegment = (id: string): string =>
  encodeURIComponent(id).replace(/%25/g, '%2525')

export const decodeRouteParam = (param?: string): string | undefined =>
  param === undefined ? undefined : safeDecodeURIComponent(param)

export const addressBookPath = (addressBookId: string): string =>
  `/contacts/${encodeRouteSegment(addressBookId)}`

export const createContactPath = (addressBookId?: string): string =>
  addressBookId
    ? `/contacts/new/${encodeRouteSegment(addressBookId)}`
    : '/contacts/new'

export const contactPath = (addressBookId: string, contactId: string): string =>
  `${addressBookPath(addressBookId)}/${encodeRouteSegment(contactId)}`

export const editContactPath = (
  addressBookId: string,
  contactId: string
): string => `${contactPath(addressBookId, contactId)}/edit`

export interface ContactRouteParams {
  addressBookId?: string
  contactId?: string
}

/** The address book and contact IDs of the current route, as stored. */
export const useContactRouteParams = (): ContactRouteParams => {
  const { addressBookId, contactId } = useParams()
  return {
    addressBookId: decodeRouteParam(addressBookId),
    contactId: decodeRouteParam(contactId)
  }
}
