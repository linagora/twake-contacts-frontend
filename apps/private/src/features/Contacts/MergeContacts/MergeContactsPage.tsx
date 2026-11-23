import {
  MergedContactTarget,
  MergeGroupError,
  useDuplicateContacts
} from '@common/features/Contacts/hooks/useDuplicateContacts'
import { DuplicateContactGroup } from '@common/features/Contacts/mergeContactsTypes'
import { useDocumentTitle } from '@common/hooks/useDocumentTitle'
import { translateMergeConflictField } from '@common/locales/dynamicKeys'
import { Check, Icon, Merge } from '@linagora/twake-icons'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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

const formatMergeError = (
  error: MergeGroupError | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string | null => {
  if (!error) return null
  if (error.reason === 'changed') return t('contacts.merge.changedError')
  if (error.reason === 'dismiss') return t('contacts.merge.dismissError')
  if (error.reason === 'conflict') {
    if (error.conflictFields?.length) {
      const fields = error.conflictFields
        .map(field => translateMergeConflictField(field, t))
        .join(', ')
      return t('contacts.merge.conflictErrorWithFields', { fields })
    }
    return t('contacts.merge.conflictError')
  }
  return t('contacts.merge.mergeError')
}

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

interface MergeContactsBodyProps {
  isLoading: boolean
  error: string | null
  groups: DuplicateContactGroup[]
  mergedIds: Set<string>
  mergedContacts: Record<string, MergedContactTarget>
  mergingGroupIds: Set<string>
  dismissingGroupIds: Set<string>
  isMerging: boolean
  isMergingAll: boolean
  groupErrors: Record<string, MergeGroupError>
  onMergeGroup: (groupId: string) => void
  onDismissGroup: (groupId: string) => void
  onViewContact: (groupId: string) => void
}

const MergeContactsEmptyState: React.FC = () => {
  const { t } = useI18n()
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

const MergeContactsBody: React.FC<MergeContactsBodyProps> = ({
  isLoading,
  error,
  groups,
  mergedIds,
  mergedContacts,
  mergingGroupIds,
  dismissingGroupIds,
  isMerging,
  isMergingAll,
  groupErrors,
  onMergeGroup,
  onDismissGroup,
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

  if (groups.length === 0) {
    return error ? null : <MergeContactsEmptyState />
  }

  const hasActiveDismissal = dismissingGroupIds.size > 0

  return (
    <Stack spacing={3} className="u-maw-7">
      {groups.map(group => (
        <DuplicateGroupCard
          key={group.id}
          group={group}
          isMerged={mergedIds.has(group.id)}
          mergedContact={mergedContacts[group.id]}
          isMerging={mergingGroupIds.has(group.id)}
          isMergeDisabled={isMergingAll || hasActiveDismissal}
          isDismissing={dismissingGroupIds.has(group.id)}
          isDismissDisabled={isMerging || hasActiveDismissal}
          error={formatMergeError(groupErrors[group.id], t)}
          onMerge={onMergeGroup}
          onDismiss={onDismissGroup}
          onViewContact={onViewContact}
        />
      ))}
    </Stack>
  )
}

const MergeContactsHeader: React.FC<{
  pendingCount: number
  isMergeAllDisabled: boolean
  onOpenMergeAll: () => void
}> = ({ pendingCount, isMergeAllDisabled, onOpenMergeAll }) => {
  const { t } = useI18n()
  const { isMobile } = useBreakpoints()
  const headingRef = useFocusHeadingOnArrival<HTMLHeadingElement>()

  return (
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
        disabled={isMergeAllDisabled}
        onClick={onOpenMergeAll}
      >
        {t('contacts.merge.mergeAll')}
      </Button>
    </Stack>
  )
}

const MergeAllConfirmationDialog: React.FC<{
  open: boolean
  disabled: boolean
  onClose: () => void
  onConfirm: () => void
}> = ({ open, disabled, onClose, onConfirm }) => {
  const { t } = useI18n()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="merge-all-title"
      aria-describedby="merge-all-description"
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id="merge-all-title">
        {t('contacts.merge.mergeAll')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="merge-all-description">
          {t('contacts.merge.mergeAllDescription')}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" autoFocus onClick={onClose}>
          {t('contacts.form.cancel')}
        </Button>
        <Button variant="contained" disabled={disabled} onClick={onConfirm}>
          {t('contacts.merge.mergeAll')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const MergeFeedbackSnackbar: React.FC<{
  message: string | null
  onClose: () => void
}> = ({ message, onClose }) => {
  const { t } = useI18n()
  return (
    <Snackbar
      open={message !== null}
      autoHideDuration={6000}
      onClose={(_event, reason) => {
        if (reason !== 'clickaway') onClose()
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        variant="filled"
        severity="success"
        closeText={t('contacts.form.close')}
        onClose={onClose}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}

export const MergeContactsPage: React.FC = () => {
  const { t } = useI18n()
  const {
    groups,
    mergedIds,
    mergedContacts,
    isLoading,
    error,
    isMerging,
    isMergingAll,
    mergingGroupIds,
    dismissingGroupIds,
    groupErrors,
    mergeGroup,
    mergeAll,
    dismissGroup
  } = useDuplicateContacts()

  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)
  const [showMergeAllConfirmation, setShowMergeAllConfirmation] =
    useState(false)
  const [hiddenGroupIds, setHiddenGroupIds] = useState<Set<string>>(
    () => new Set()
  )
  const visibleGroups = groups.filter(group => !hiddenGroupIds.has(group.id))
  const pendingCount = groups.filter(group => !mergedIds.has(group.id)).length
  const isBusy = isLoading || isMerging || dismissingGroupIds.size > 0
  const isMergeAllDisabled = isBusy || pendingCount === 0
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
        <MergeContactsHeader
          pendingCount={pendingCount}
          isMergeAllDisabled={isMergeAllDisabled}
          onOpenMergeAll={() => setShowMergeAllConfirmation(true)}
        />

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
          dismissingGroupIds={dismissingGroupIds}
          isMerging={isMerging}
          isMergingAll={isMergingAll}
          groupErrors={groupErrors}
          onMergeGroup={id =>
            void runWithFeedback(
              () => mergeGroup(id),
              'contacts.merge.mergeSuccess'
            )
          }
          onDismissGroup={id =>
            void runWithFeedback(
              () => dismissGroup(id),
              'contacts.merge.dismissSuccess'
            )
          }
          onViewContact={id => setHiddenGroupIds(prev => new Set(prev).add(id))}
        />
      </Stack>

      <MergeAllConfirmationDialog
        open={showMergeAllConfirmation}
        disabled={isMergeAllDisabled}
        onClose={() => setShowMergeAllConfirmation(false)}
        onConfirm={() => {
          setShowMergeAllConfirmation(false)
          void runWithFeedback(mergeAll, 'contacts.merge.mergeAllSuccess')
        }}
      />

      <MergeFeedbackSnackbar
        message={snackbarMessage}
        onClose={() => setSnackbarMessage(null)}
      />
    </>
  )
}
