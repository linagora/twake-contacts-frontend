import { useEffect, useState } from 'react'
import {
  AddressBook,
  UserResult
} from '@common/features/Contacts/contactsTypes'
import { fetchSubscribableAddressBooks } from '@common/features/Contacts/ContactsDao'

interface Lookup {
  userId: string
  books: AddressBook[]
  failed: boolean
}

export function usePublicBooksLookup(user: UserResult | null): {
  fetched: AddressBook[] | null
  failed: boolean
} {
  const [result, setResult] = useState<Lookup | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async (): Promise<void> => {
      let books: AddressBook[] = []
      let failed = false
      try {
        books = await fetchSubscribableAddressBooks(user.id)
      } catch {
        failed = true
      }
      if (!cancelled) setResult({ userId: user.id, books, failed })
    }
    void load()
    return (): void => {
      cancelled = true
    }
  }, [user])

  // a result for another user means we're still loading this one
  const current = result?.userId === user?.id ? result : null
  return {
    fetched: current && !current.failed ? current.books : null,
    failed: current?.failed ?? false
  }
}
