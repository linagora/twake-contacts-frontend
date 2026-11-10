import React, { useMemo } from 'react'
import {
  Stack,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Box,
  Skeleton
} from '@linagora/twake-mui'
import { Icon, UserGroup } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { userData } from '@common/features/User/userDataTypes'
import { useAppSelector } from '@common/app/hooks'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { MemberRow } from './MemberRow'
import { partitionMembers } from './sharingHelpers'

interface MembersListProps {
  userData: userData
  invitedMembers: userData[]
  onUpdateMember: (user: userData, role: AddressBookAccessLevel) => void
  updatingMemberId?: string | null
}

export const MembersList: React.FC<MembersListProps> = ({
  userData,
  invitedMembers,
  onUpdateMember,
  updatingMemberId
}) => {
  const { t } = useI18n()
  const loading = useAppSelector(state => state.contacts.detailsLoading)

  const { me, others } = useMemo(
    () => partitionMembers(invitedMembers, userData),
    [invitedMembers, userData]
  )

  if (loading) {
    return (
      <List disablePadding className="u-mt-1">
        {[1, 2, 3].map(i => (
          <ListItem key={i} dense disableGutters>
            <ListItemAvatar>
              <Skeleton variant="circular" width={40} height={40} />
            </ListItemAvatar>
            <ListItemText
              primary={<Skeleton width={120} />}
              secondary={<Skeleton width={160} />}
            />
          </ListItem>
        ))}
      </List>
    )
  }

  return (
    <Stack className="u-mt-1">
      <List disablePadding>
        <MemberRow member={me} isCurrentUser />
        {others.map((member, index) => (
          <MemberRow
            key={member.openpaasId || index}
            member={member}
            onUpdateMember={onUpdateMember}
            isUpdating={updatingMemberId === member.openpaasId}
          />
        ))}
      </List>

      {others.length === 0 && (
        <div
          className="u-p-3 u-mt-1 u-bdrs-6 u-flex u-flex-column u-flex-items-center"
          style={{
            backgroundColor: 'var(--twake-palette-background-contrast)'
          }}
        >
          <Box>
            <Icon icon={UserGroup} size={60} color="primary" />
          </Box>
          <Typography variant="body2" className="u-mb-half">
            {t('contacts.share.emptyTitle')}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {t('contacts.share.emptySubtitle')}
          </Typography>
        </div>
      )}
    </Stack>
  )
}
