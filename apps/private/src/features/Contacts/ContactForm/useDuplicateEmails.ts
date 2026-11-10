import { searchContacts } from '@common/features/Contacts/ContactsDao'
import { ContactEntry } from '@common/features/Contacts/contactsTypes'
import { isValidEmail } from '@common/utils/validation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchAddressBookRefs } from '../useSearchAddressBookRefs'

const DUPLICATE_CHECK_DELAY_MS = 300

type DuplicatesByEmail = Record<string, ContactEntry[]>

export interface DuplicateEmails {
  checkEmail: (index: number, email: string) => void
  getDuplicates: (email: string) => ContactEntry[]
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

// The search is fuzzy: only an exact address, whatever its case, is a duplicate
const hasEmail = (entry: ContactEntry, email: string): boolean =>
  entry.contact.emails.some(({ value }) => normalizeEmail(value) === email)

// The domain book is searched as domain-members, while it is stored as dab
const toStoreEntry = (entry: ContactEntry): ContactEntry =>
  entry.addressBookId === 'domain-members'
    ? { ...entry, addressBookId: 'dab' }
    : entry

export const useDuplicateEmails = (enabled: boolean): DuplicateEmails => {
  const addressBookRefs = useSearchAddressBookRefs()
  const [duplicates, setDuplicates] = useState<DuplicatesByEmail>({})
  const requestedEmails = useRef(new Set<string>())
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const pending = timers.current
    return (): void => pending.forEach(clearTimeout)
  }, [])

  const searchDuplicates = useCallback(
    async (email: string): Promise<void> => {
      requestedEmails.current.add(email)
      try {
        const entries = await searchContacts(addressBookRefs, email)
        setDuplicates(prev => ({
          ...prev,
          [email]: entries
            .filter(entry => hasEmail(entry, email))
            .map(toStoreEntry)
        }))
      } catch {
        // the warning is a help: a failed search shows nothing
        requestedEmails.current.delete(email)
      }
    },
    [addressBookRefs]
  )

  const canCheck = enabled && addressBookRefs.length > 0

  const needsSearch = useCallback(
    (email: string): boolean =>
      isValidEmail(email) && !requestedEmails.current.has(email),
    []
  )

  const checkEmail = useCallback(
    (index: number, value: string): void => {
      clearTimeout(timers.current.get(index))
      const email = normalizeEmail(value)
      if (!canCheck || !needsSearch(email)) {
        return
      }
      timers.current.set(
        index,
        setTimeout(() => {
          timers.current.delete(index)
          void searchDuplicates(email)
        }, DUPLICATE_CHECK_DELAY_MS)
      )
    },
    [canCheck, needsSearch, searchDuplicates]
  )

  // read from the field's current value: an answer for a former value is not shown
  const getDuplicates = useCallback(
    (value: string): ContactEntry[] =>
      enabled ? (duplicates[normalizeEmail(value)] ?? []) : [],
    [enabled, duplicates]
  )

  return { checkEmail, getDuplicates }
}
