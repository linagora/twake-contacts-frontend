import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState
} from 'react'
import { AddressBook } from '../contactsTypes'
import {
  DuplicateContactEntry,
  DuplicateContactGroup
} from '../mergeContactsTypes'
import {
  findDuplicateContactGroups,
  isPersonalMergeableBook,
  MergeContactError
} from '../mergeContactsUtils'
import {
  executeGroupDismissal,
  executeGroupMerge,
  loadPersonalBookDuplicates,
  MergedContactTarget,
  runQueuedMerges
} from './duplicateMergeRunner'

export type { MergedContactTarget }

const MERGE_ALL_QUEUE_LIMIT = 5

export type MergeErrorReason = 'changed' | 'conflict' | 'error' | 'dismiss'

export interface MergeGroupError {
  reason: MergeErrorReason
  conflictFields?: string[]
}

const toMergeGroupError = (
  error: unknown,
  fallback: 'error' | 'dismiss' = 'error'
): MergeGroupError => {
  if (!(error instanceof MergeContactError)) return { reason: fallback }
  return error.conflictFields.length > 0
    ? { reason: error.reason, conflictFields: error.conflictFields }
    : { reason: error.reason }
}

const addSetItem = (prev: Set<string>, id: string): Set<string> =>
  new Set(prev).add(id)

const deleteSetItem = (prev: Set<string>, id: string): Set<string> => {
  const next = new Set(prev)
  next.delete(id)
  return next
}

const omitGroupErrors = (
  prev: Record<string, MergeGroupError>,
  groupIds: string[]
): Record<string, MergeGroupError> => {
  const excluded = new Set(groupIds)
  return Object.fromEntries(
    Object.entries(prev).filter(([id]) => !excluded.has(id))
  )
}

const updateRefreshedGroup = (
  group: DuplicateContactGroup,
  id: string,
  entries: DuplicateContactEntry[]
): DuplicateContactGroup[] => {
  if (group.id !== id) return [group]
  return findDuplicateContactGroups(entries)
}

function usePersonalDuplicateScan(
  openpaasId: string | undefined,
  personalBooks: AddressBook[]
): {
  detectedGroups: DuplicateContactGroup[]
  isLoading: boolean
  error: string | null
  refreshGroup: (id: string, entries: DuplicateContactEntry[]) => void
} {
  const getPersonalBooks = useEffectEvent(() => personalBooks)
  const personalBooksKey = useMemo(
    () =>
      personalBooks
        .map(book => book.id)
        .sort()
        .join(','),
    [personalBooks]
  )

  const [detectedGroups, setDetectedGroups] = useState<DuplicateContactGroup[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const booksToScan = getPersonalBooks()
    if (!openpaasId || booksToScan.length === 0) {
      setDetectedGroups([])
      setIsLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const scan = async (): Promise<void> => {
      try {
        const result = await loadPersonalBookDuplicates(openpaasId, booksToScan)
        if (!cancelled) setDetectedGroups(result)
      } catch {
        if (!cancelled) setError('contacts.merge.loadError')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void scan()

    return () => {
      cancelled = true
    }
  }, [openpaasId, personalBooksKey])

  const refreshGroup = useCallback(
    (id: string, entries: DuplicateContactEntry[]) => {
      setDetectedGroups(previous =>
        previous.flatMap(group => updateRefreshedGroup(group, id, entries))
      )
    },
    []
  )

  return { detectedGroups, isLoading, error, refreshGroup }
}

function useSingleGroupAction(
  detectedGroups: DuplicateContactGroup[],
  applyAction: (group: DuplicateContactGroup) => Promise<void>,
  setGroupErrors: React.Dispatch<
    React.SetStateAction<Record<string, MergeGroupError>>
  >,
  fallback?: 'dismiss'
): {
  activeGroupIds: Set<string>
  runGroupAction: (groupId: string) => Promise<void>
} {
  const [activeGroupIds, setActiveGroupIds] = useState<Set<string>>(
    () => new Set()
  )

  const runGroupAction = useCallback(
    async (groupId: string): Promise<void> => {
      const group = detectedGroups.find(g => g.id === groupId)
      if (!group) return
      setGroupErrors(prev => omitGroupErrors(prev, [groupId]))
      setActiveGroupIds(prev => addSetItem(prev, groupId))
      try {
        await applyAction(group)
      } catch (err) {
        setGroupErrors(prev => ({
          ...prev,
          [groupId]: toMergeGroupError(err, fallback)
        }))
        throw err
      } finally {
        setActiveGroupIds(prev => deleteSetItem(prev, groupId))
      }
    },
    [detectedGroups, applyAction, setGroupErrors, fallback]
  )

  return { activeGroupIds, runGroupAction }
}

function useBatchGroupMerge(
  detectedGroups: DuplicateContactGroup[],
  mergedIds: Set<string>,
  applyMerge: (group: DuplicateContactGroup) => Promise<void>,
  setGroupErrors: React.Dispatch<
    React.SetStateAction<Record<string, MergeGroupError>>
  >
): {
  isMergingAll: boolean
  mergeAll: () => Promise<void>
} {
  const [isMergingAll, setIsMergingAll] = useState(false)

  const mergeAll = useCallback(async (): Promise<void> => {
    const pendingGroups = detectedGroups.filter(
      group => !mergedIds.has(group.id)
    )
    if (pendingGroups.length === 0) return
    setGroupErrors(prev =>
      omitGroupErrors(
        prev,
        pendingGroups.map(g => g.id)
      )
    )
    setIsMergingAll(true)
    const batchErrors: Record<string, MergeGroupError> = {}
    try {
      await runQueuedMerges(
        pendingGroups,
        MERGE_ALL_QUEUE_LIMIT,
        async group => {
          try {
            await applyMerge(group)
          } catch (err) {
            batchErrors[group.id] = toMergeGroupError(err)
            throw err
          }
        }
      )
    } finally {
      if (Object.keys(batchErrors).length > 0) {
        setGroupErrors(prev => ({ ...prev, ...batchErrors }))
      }
      setIsMergingAll(false)
    }
  }, [detectedGroups, mergedIds, applyMerge, setGroupErrors])

  return { isMergingAll, mergeAll }
}

function useGroupActionCallbacks(
  openpaasId: string | undefined,
  personalBooks: AddressBook[],
  refreshGroup: (id: string, entries: DuplicateContactEntry[]) => void
): {
  mergedIds: Set<string>
  mergedContacts: Record<string, MergedContactTarget>
  applyMerge: (group: DuplicateContactGroup) => Promise<void>
  applyDismissal: (group: DuplicateContactGroup) => Promise<void>
} {
  const dispatch = useAppDispatch()
  const [mergedIds, setMergedIds] = useState<Set<string>>(() => new Set())
  const [mergedContacts, setMergedContacts] = useState<
    Record<string, MergedContactTarget>
  >({})

  const applyMerge = useCallback(
    async (group: DuplicateContactGroup): Promise<void> => {
      if (!openpaasId) return
      const target = await executeGroupMerge({
        dispatch,
        userId: openpaasId,
        group,
        books: personalBooks,
        refreshGroup: entries => refreshGroup(group.id, entries)
      })
      setMergedIds(prev => addSetItem(prev, group.id))
      setMergedContacts(prev => ({ ...prev, [group.id]: target }))
    },
    [dispatch, openpaasId, personalBooks, refreshGroup]
  )

  const applyDismissal = useCallback(
    async (group: DuplicateContactGroup): Promise<void> => {
      if (!openpaasId) return
      await executeGroupDismissal({
        dispatch,
        userId: openpaasId,
        group,
        books: personalBooks,
        refreshGroup: entries => refreshGroup(group.id, entries)
      })
      refreshGroup(group.id, [])
    },
    [dispatch, openpaasId, personalBooks, refreshGroup]
  )

  return { mergedIds, mergedContacts, applyMerge, applyDismissal }
}

function useMergeExecution(
  openpaasId: string | undefined,
  personalBooks: AddressBook[],
  detectedGroups: DuplicateContactGroup[],
  refreshGroup: (id: string, entries: DuplicateContactEntry[]) => void
): Omit<UseDuplicateContactsResult, 'groups' | 'isLoading' | 'error'> {
  const [groupErrors, setGroupErrors] = useState<
    Record<string, MergeGroupError>
  >({})

  const { mergedIds, mergedContacts, applyMerge, applyDismissal } =
    useGroupActionCallbacks(openpaasId, personalBooks, refreshGroup)

  const { activeGroupIds: mergingGroupIds, runGroupAction: mergeGroup } =
    useSingleGroupAction(detectedGroups, applyMerge, setGroupErrors)
  const { activeGroupIds: dismissingGroupIds, runGroupAction: dismissGroup } =
    useSingleGroupAction(
      detectedGroups,
      applyDismissal,
      setGroupErrors,
      'dismiss'
    )
  const { isMergingAll, mergeAll } = useBatchGroupMerge(
    detectedGroups,
    mergedIds,
    applyMerge,
    setGroupErrors
  )

  return {
    mergedIds,
    mergedContacts,
    isMerging: isMergingAll || mergingGroupIds.size > 0,
    isMergingAll,
    mergingGroupIds,
    dismissingGroupIds,
    groupErrors,
    dismissGroup,
    mergeGroup,
    mergeAll
  }
}

export interface UseDuplicateContactsResult {
  groups: DuplicateContactGroup[]
  mergedIds: Set<string>
  mergedContacts: Record<string, MergedContactTarget>
  isLoading: boolean
  error: string | null
  isMerging: boolean
  isMergingAll: boolean
  mergingGroupIds: Set<string>
  dismissingGroupIds: Set<string>
  groupErrors: Record<string, MergeGroupError>
  mergeGroup: (groupId: string) => Promise<void>
  mergeAll: () => Promise<void>
  dismissGroup: (groupId: string) => Promise<void>
}

/**
 * Fetches contacts from personal address books using the address-book contacts
 * listing API and detects duplicates by linearly walking name, email, phone,
 * and Matrix ID ordered lists. Merging updates the most complete contact and
 * deletes the remaining duplicates.
 */
export function useDuplicateContacts(): UseDuplicateContactsResult {
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const booksLoading = useAppSelector(state => state.contacts.loading)
  const personalBooks = useMemo(
    () => Object.values(addressBooks).filter(isPersonalMergeableBook),
    [addressBooks]
  )

  const { detectedGroups, isLoading, error, refreshGroup } =
    usePersonalDuplicateScan(openpaasId, personalBooks)
  const mergeState = useMergeExecution(
    openpaasId,
    personalBooks,
    detectedGroups,
    refreshGroup
  )

  return {
    groups: detectedGroups,
    isLoading: booksLoading || isLoading,
    error,
    ...mergeState
  }
}
