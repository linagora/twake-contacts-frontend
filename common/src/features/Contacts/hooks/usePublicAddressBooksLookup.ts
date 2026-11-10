import { useEffect, useState } from 'react'
import { RawAddressBook, UserResult } from '../contactsTypes'
import { fetchSubscribableAddressBooks } from '../ContactsDao'

interface Lookup {
  userId: string
  books: RawAddressBook[]
  failed: boolean
}

/** Loads the address books of `user` that the current user may subscribe to. */
export function usePublicAddressBooksLookup(user: UserResult | null): {
  fetched: RawAddressBook[] | null
  failed: boolean
} {
  const [result, setResult] = useState<Lookup | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async (): Promise<void> => {
      let books: RawAddressBook[] = []
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
