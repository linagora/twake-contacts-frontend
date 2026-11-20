import { Contact } from '@common/features/Contacts/contactsTypes'
import { MergedContactTarget } from '@common/features/Contacts/hooks/useDuplicateContacts'
import { DuplicateContactGroup } from '@common/features/Contacts/mergeContactsTypes'
import { translateContactType } from '@common/locales/dynamicKeys'
import { Check, Email, Icon, Matrix, Telephone } from '@linagora/twake-icons'
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography
} from '@linagora/twake-mui'
import { Link } from 'react-router'
import { useI18n } from 'twake-i18n'
import { ContactAvatar } from '../ContactAvatar'
import { contactPath } from '../contactPath'

export interface DuplicateGroupCardProps {
  group: DuplicateContactGroup
  isMerged: boolean
  mergedContact?: MergedContactTarget
  isMerging: boolean
  isMergeDisabled?: boolean
  hideActions?: boolean
  error?: string | null
  onMerge: (groupId: string) => void
  onViewContact?: (groupId: string) => void
}

const getCardBorderColor = (
  error: string | null,
  isMerged: boolean
): 'error.main' | 'success.main' | undefined => {
  if (error) return 'error.main'
  if (isMerged) return 'success.main'
  return undefined
}

const TypedContactFieldRow: React.FC<{
  icon: typeof Telephone
  value: string
  type?: string | null
}> = ({ icon, value, type }) => {
  const { t } = useI18n()
  return (
    <Stack direction="row" spacing={1.5} className="u-flex-items-center">
      <Icon icon={icon} size={18} aria-hidden />
      <Typography variant="body2">{value}</Typography>
      {type && (
        <Typography variant="body2" color="text.secondary">
          {translateContactType(type, t)}
        </Typography>
      )}
    </Stack>
  )
}

const DuplicateContactEntryItem: React.FC<{ contact: Contact }> = ({
  contact
}) => (
  <Stack
    spacing={3}
    className="u-flex-grow-1 u-flex-shrink-0 u-miw-4"
    role="listitem"
  >
    <Stack direction="row" spacing={1.5} className="u-flex-items-center">
      <ContactAvatar size="s" displayName={contact.displayName} />
      <Typography variant="body1">{contact.displayName}</Typography>
    </Stack>

    {contact.phones?.map((phone, index) => (
      <TypedContactFieldRow
        key={`phone-${index}-${phone.value}`}
        icon={Telephone}
        value={phone.value}
        type={phone.type}
      />
    ))}

    {contact.emails.map((email, index) => (
      <TypedContactFieldRow
        key={`email-${index}-${email.value}`}
        icon={Email}
        value={email.value}
        type={email.type}
      />
    ))}

    {contact.socialProfiles?.map((profile, index) => (
      <TypedContactFieldRow
        key={`social-${index}-${profile.value}`}
        icon={Matrix}
        value={profile.value}
      />
    ))}
  </Stack>
)

const CardActionButton: React.FC<{
  groupId: string
  isMerged: boolean
  mergedContact?: MergedContactTarget
  isMerging: boolean
  isMergeDisabled: boolean
  onMerge: (groupId: string) => void
  onViewContact?: (groupId: string) => void
}> = ({
  groupId,
  isMerged,
  mergedContact,
  isMerging,
  isMergeDisabled,
  onMerge,
  onViewContact
}) => {
  const { t } = useI18n()
  if (isMerged && mergedContact) {
    return (
      <Button
        component={Link}
        to={contactPath(mergedContact.addressBookId, mergedContact.contactId)}
        target="_blank"
        rel="noopener noreferrer"
        variant="ghost"
        onClick={() => onViewContact?.(groupId)}
      >
        {t('contacts.merge.viewContact')}
      </Button>
    )
  }
  if (isMerged) return null
  return (
    <Button
      variant="ghost"
      onClick={() => onMerge(groupId)}
      loading={isMerging}
      disabled={isMergeDisabled || isMerging}
    >
      {t('contacts.merge.merge')}
    </Button>
  )
}

export const DuplicateGroupCard: React.FC<DuplicateGroupCardProps> = ({
  group,
  isMerged,
  mergedContact,
  isMerging,
  isMergeDisabled = false,
  hideActions = false,
  error = null,
  onMerge,
  onViewContact
}) => {
  const { t } = useI18n()
  const borderColor = getCardBorderColor(error, isMerged)

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={borderColor ? { borderColor } : undefined}
        className="u-p-2 u-bdrs-6 u-pos-relative"
      >
        {isMerged && (
          <Box
            role="img"
            aria-label={t('contacts.merge.merged')}
            className="u-pos-absolute u-top-s u-right-s u-success"
          >
            <Icon icon={Check} size={20} />
          </Box>
        )}
        {error && (
          <Alert severity="error" className="u-mb-1">
            {error}
          </Alert>
        )}
        <Stack direction="row" spacing={4} className="u-ov-auto" role="list">
          {group.entries.map(({ addressBookId, contact }) => (
            <DuplicateContactEntryItem
              key={`${addressBookId}:${contact.id}`}
              contact={contact}
            />
          ))}
        </Stack>
      </Paper>

      {!hideActions && (
        <Stack
          direction="row"
          spacing={2}
          className="u-flex-items-center u-flex-justify-end u-mt-1"
        >
          <CardActionButton
            groupId={group.id}
            isMerged={isMerged}
            mergedContact={mergedContact}
            isMerging={isMerging}
            isMergeDisabled={isMergeDisabled}
            onMerge={onMerge}
            onViewContact={onViewContact}
          />
        </Stack>
      )}
    </Box>
  )
}
