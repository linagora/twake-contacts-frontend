// IDs are stored decoded. Encode each route segment once; React Router
// returns the decoded IDs in useParams.
export const addressBookPath = (addressBookId: string): string =>
  `/contacts/${encodeURIComponent(addressBookId)}`

export const createContactPath = (addressBookId?: string): string =>
  addressBookId
    ? `/contacts/new/${encodeURIComponent(addressBookId)}`
    : '/contacts/new'

export const contactPath = (addressBookId: string, contactId: string): string =>
  `${addressBookPath(addressBookId)}/${encodeURIComponent(contactId)}`

export const editContactPath = (
  addressBookId: string,
  contactId: string
): string => `${contactPath(addressBookId, contactId)}/edit`
