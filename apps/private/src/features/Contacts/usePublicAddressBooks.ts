import { useState } from 'react'
import { useAppSelector } from '@common/app/hooks'
import {
  AddressBook,
  UserResult
} from '@common/features/Contacts/contactsTypes'
import { usePublicAddressBooksLookup } from '@common/features/Contacts/hooks/usePublicAddressBooksLookup'

type EmptyMessageKey =
  | 'contacts.addressBook.noneAvailable'
  | 'contacts.addressBook.allSubscribed'
  | 'contacts.addressBook.loadError'

const bookKey = (b: AddressBook): string => `${b.userId}/${b.id}`
const sourceKey = (b: AddressBook): string => `${b.ownerId}/${b.sourceBookId}`

// a book is already in the sidebar if it's shared with me (same owner/id)
// or if it's a subscription pointing to it
function getSubscribedKeys(books: AddressBook[]): Set<string> {
  return new Set(books.map(b => (b.sourceBookId ? sourceKey(b) : bookKey(b))))
}

function getEmptyMessageKey(
  fetched: AddressBook[] | null,
  available: AddressBook[]
): EmptyMessageKey | null {
  if (!fetched || available.length > 0) return null
  return fetched.length === 0
    ? 'contacts.addressBook.noneAvailable'
    : 'contacts.addressBook.allSubscribed'
}

export function usePublicAddressBooks(): {
  user: UserResult | null
  selectUser: (user: UserResult) => void
  clearUser: () => void
  books: AddressBook[]
  emptyMessageKey: EmptyMessageKey | null
  removeBook: (book: AddressBook) => void
} {
  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const [user, setUser] = useState<UserResult | null>(null)
  const [removedKeys, setRemovedKeys] = useState<string[]>([])
  const { fetched, failed } = usePublicAddressBooksLookup(user)

  const subscribedKeys = getSubscribedKeys(Object.values(addressBooks))
  const available = (fetched ?? []).filter(b => !subscribedKeys.has(bookKey(b)))

  return {
    user,
    selectUser: u => {
      setUser(u)
      setRemovedKeys([])
    },
    clearUser: () => {
      setUser(null)
      setRemovedKeys([])
    },
    books: available.filter(b => !removedKeys.includes(bookKey(b))),
    emptyMessageKey: failed
      ? 'contacts.addressBook.loadError'
      : getEmptyMessageKey(fetched, available),
    removeBook: book => setRemovedKeys(keys => [...keys, bookKey(book)])
  }
}
