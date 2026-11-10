// A contact id is a card file name that may hold reserved characters (a/b):
// it is encoded in the path, React Router gives it back decoded in the params
export const contactPath = (addressBookId: string, contactId: string): string =>
  `/contacts/${addressBookId}/${encodeURIComponent(contactId)}`

export const editContactPath = (
  addressBookId: string,
  contactId: string
): string => `${contactPath(addressBookId, contactId)}/edit`
