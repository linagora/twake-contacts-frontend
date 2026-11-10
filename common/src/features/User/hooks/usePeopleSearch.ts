import { useEffect, useState } from 'react'
import { useAppSelector } from '@common/app/hooks'
import { UserResult } from '@common/features/Contacts/contactsTypes'
import { searchUsers } from '@common/features/Contacts/ContactsDao'

const DEBOUNCE_MS = 300

/** Debounced search of the other users of the platform, for `query`. */
export function usePeopleSearch(query: string): {
  users: UserResult[]
  loading: boolean
} {
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const [result, setResult] = useState<{
    query: string
    users: UserResult[]
  } | null>(null)
  const trimmed = query.trim()

  useEffect(() => {
    if (!trimmed || !openpaasId) return
    const ctrl = new AbortController()

    const timer = setTimeout((): void => {
      const run = async (): Promise<void> => {
        let users: UserResult[] = []
        try {
          users = await searchUsers(trimmed, openpaasId, ctrl.signal)
        } catch {
          // failed search: show no option for this query
        }
        if (!ctrl.signal.aborted) setResult({ query: trimmed, users })
      }
      void run()
    }, DEBOUNCE_MS)

    return (): void => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [trimmed, openpaasId])

  const current = result?.query === trimmed
  return {
    users: current ? result.users : [],
    loading: Boolean(trimmed) && !current
  }
}
