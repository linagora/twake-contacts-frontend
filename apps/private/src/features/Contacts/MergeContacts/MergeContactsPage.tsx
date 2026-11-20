import {
  MergedContactTarget,
  MergeGroupError,
  useDuplicateContacts
} from '@common/features/Contacts/hooks/useDuplicateContacts'
import { DuplicateContactGroup } from '@common/features/Contacts/mergeContactsTypes'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { Check, Icon, Merge } from '@linagora/twake-icons'
import {
  Alert,
  Button,
  CircularProgress,
  Empty,
  Snackbar,
  Stack,
  Typography,
  useBreakpoints
} from '@linagora/twake-mui'
import { useState } from 'react'
import { Link } from 'react-router'
import { useI18n } from 'twake-i18n'
import { useFocusHeadingOnArrival } from '../focusHeadingOnArrival'
import { DuplicateGroupCard } from './DuplicateGroupCard'
import { formatMergeError } from './formatMergeError'

const getOrphanedGroupErrors = (
  groups: DuplicateContactGroup[],
  groupErrors: Record<string, MergeGroupError>,
  t: (key: string, options?: Record<string, unknown>) => string
): string[] => {
  const groupIds = new Set(groups.map(group => group.id))
  return Object.entries(groupErrors)
    .filter(([groupId]) => !groupIds.has(groupId))
    .map(([, groupError]) => formatMergeError(groupError, t))
    .filter((message): message is string => message !== null)
}

const MergeContactsBody: React.FC<{
  isLoading: boolean
  error: string | null
  groups: DuplicateContactGroup[]
  mergedIds: Set<string>
  mergedContacts: Record<string, MergedContactTarget>
  mergingGroupIds: Set<string>
  isMergingAll: boolean
  groupErrors: Record<string, MergeGroupError>
  onMergeGroup: (groupId: string) => void
  onViewContact: (groupId: string) => void
}> = ({
  isLoading,
  error,
  groups,
  mergedIds,
  mergedContacts,
  mergingGroupIds,
  isMergingAll,
  groupErrors,
  onMergeGroup,
  onViewContact
}) => {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <Stack className="u-flex-items-center u-p-3">
        <CircularProgress />
      </Stack>
    )
  }

  if (groups.length === 0 && error) return null

  if (groups.length === 0) {
    return (
      <Empty
        icon={<Icon icon={Merge} size={48} />}
        iconSize="normal"
        title={t('contacts.merge.emptyTitle')}
        text={t('contacts.merge.emptySubtitle')}
        componentsProps={{ title: { component: 'h2' } }}
      >
        <Stack className="u-flex-items-center u-mt-1">
          <Button component={Link} to="/contacts" variant="outlined">
            {t('contacts.back')}
          </Button>
        </Stack>
      </Empty>
    )
  }

  return (
    <Stack spacing={3} className="u-maw-7">
      {groups.map(group => (
        <DuplicateGroupCard
          key={group.id}
          group={group}
          isMerged={mergedIds.has(group.id)}
          mergedContact={mergedContacts[group.id]}
          isMerging={mergingGroupIds.has(group.id)}
          isMergeDisabled={isMergingAll}
          error={formatMergeError(groupErrors[group.id], t)}
          onMerge={onMergeGroup}
          onViewContact={onViewContact}
        />
      ))}
    </Stack>
  )
}

export const MergeContactsPage: React.FC = () => {
  const { t } = useI18n()
  const { isMobile } = useBreakpoints()
  const headingRef = useFocusHeadingOnArrival<HTMLHeadingElement>()
  const {
    groups,
    mergedIds,
    mergedContacts,
    isLoading,
    error,
    isMerging,
    isMergingAll,
    mergingGroupIds,
    groupErrors,
    mergeGroup,
    mergeAll
  } = useDuplicateContacts()

  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)
  const [hiddenGroupIds, setHiddenGroupIds] = useState<Set<string>>(
    () => new Set()
  )
  const visibleGroups = groups.filter(group => !hiddenGroupIds.has(group.id))
  const pendingCount = groups.filter(group => !mergedIds.has(group.id)).length
  const orphanedGroupErrors = getOrphanedGroupErrors(groups, groupErrors, t)

  useDocumentTitle(t('contacts.merge.title'))

  const runWithFeedback = async (
    action: () => Promise<void>,
    successKey: string
  ): Promise<void> => {
    setSnackbarMessage(null)
    try {
      await action()
      setSnackbarMessage(t(successKey))
    } catch {
      // Per-group errors are stored in groupErrors and rendered inside each card.
    }
  }

  return (
    <>
      <Stack spacing={3}>
        <Stack
          direction="row"
          spacing={2}
          className="u-flex-items-center u-flex-justify-between"
        >
          <Typography
            ref={headingRef}
            tabIndex={-1}
            component={isMobile ? 'p' : 'h1'}
            variant="h5"
          >
            {pendingCount > 0
              ? t('contacts.merge.headingWithCount', { count: pendingCount })
              : t('contacts.merge.title')}
          </Typography>

          <Button
            variant="contained"
            startIcon={<Icon icon={Check} />}
            disabled={isLoading || pendingCount === 0 || isMerging}
            onClick={() =>
              void runWithFeedback(mergeAll, 'contacts.merge.mergeAllSuccess')
            }
          >
            {t('contacts.merge.mergeAll')}
          </Button>
        </Stack>

        {error && <Alert severity="error">{t(error)}</Alert>}
        {orphanedGroupErrors.map((message, index) => (
          <Alert key={index} severity="error">
            {message}
          </Alert>
        ))}

        <MergeContactsBody
          isLoading={isLoading}
          error={error}
          groups={visibleGroups}
          mergedIds={mergedIds}
          mergedContacts={mergedContacts}
          mergingGroupIds={mergingGroupIds}
          isMergingAll={isMergingAll}
          groupErrors={groupErrors}
          onMergeGroup={id =>
            void runWithFeedback(
              () => mergeGroup(id),
              'contacts.merge.mergeSuccess'
            )
          }
          onViewContact={id => setHiddenGroupIds(prev => new Set(prev).add(id))}
        />
      </Stack>

      <Snackbar
        open={snackbarMessage !== null}
        autoHideDuration={6000}
        onClose={(_event, reason) => {
          if (reason !== 'clickaway') setSnackbarMessage(null)
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          variant="filled"
          severity="success"
          closeText={t('contacts.form.close')}
          onClose={() => setSnackbarMessage(null)}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  )
}
