import React, { useMemo } from 'react'
import {
  Stack,
  Typography,
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Box,
  Skeleton
} from '@linagora/twake-mui'
import { RoleSelector } from './RoleSelector'
import { Icon, CrossCircleOutline, UserGroup } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { userData } from '@common/features/User/userDataTypes'
import { useAppSelector } from '@common/app/hooks'
import { getInitials } from '../getInitials'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'

interface MembersListProps {
  userData: userData
  invitedMembers: userData[]
  onUpdateMember: (user: userData, role: AddressBookAccessLevel) => void
  updatingMemberId?: string | null
}

const renderRoleText = (role?: AddressBookAccessLevel): string => {
  if (role === AddressBookAccessLevel.Owner) return 'contacts.share.owner'
  if (role === AddressBookAccessLevel.Editor) return 'contacts.share.editor'
  if (role === AddressBookAccessLevel.Viewer) return 'contacts.share.viewer'
  return ''
}

export const MembersList: React.FC<MembersListProps> = ({
  userData,
  invitedMembers,
  onUpdateMember,
  updatingMemberId
}) => {
  const { t } = useI18n()
  const loading = useAppSelector(state => state.contacts.detailsLoading)

  const { me, others } = useMemo(() => {
    const meMatch = invitedMembers.find(
      m => m.openpaasId === userData.openpaasId
    )
    const othersList = invitedMembers.filter(
      m =>
        m.openpaasId !== userData.openpaasId &&
        m.role !== AddressBookAccessLevel.None
    )

    return {
      me: meMatch || { ...userData },
      others: othersList
    }
  }, [invitedMembers, userData])

  if (loading) {
    return (
      <Stack className="u-mt-1">
        {[1, 2, 3].map(i => (
          <ListItem key={i} disableGutters>
            <ListItemAvatar>
              <Skeleton
                className="u-ml-auto"
                variant="circular"
                width={40}
                height={40}
              />
            </ListItemAvatar>
            <ListItemText
              primary={<Skeleton width={120} />}
              secondary={<Skeleton width={160} />}
            />
          </ListItem>
        ))}
      </Stack>
    )
  }

  return (
    <Stack className="u-mt-1">
      <ListItem className="u-pl-half">
        <ListItemAvatar>
          <Avatar className="u-ml-auto">{getInitials(me.name)}</Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={t('contacts.share.you')}
          secondary={me.email || userData.email}
        />
        <Typography variant="body2" color="textSecondary">
          {t(renderRoleText(me.role))}
        </Typography>
      </ListItem>

      {others.length > 0 ? (
        others.map((member, index) => (
          <ListItem key={member.openpaasId || index} className="u-pl-half">
            <ListItemAvatar>
              <Avatar className="u-ml-auto">{getInitials(member.name)}</Avatar>
            </ListItemAvatar>
            <ListItemText primary={member.name} secondary={member.email} />
            {member.role !== AddressBookAccessLevel.Owner ? (
              <>
                <RoleSelector
                  value={member.role || AddressBookAccessLevel.Viewer}
                  onChange={e =>
                    onUpdateMember(
                      member,
                      e.target.value as AddressBookAccessLevel
                    )
                  }
                  disabled={updatingMemberId === member.openpaasId}
                />
                <IconButton
                  size="small"
                  className="u-ml-2"
                  onClick={() =>
                    onUpdateMember(member, AddressBookAccessLevel.None)
                  }
                  disabled={updatingMemberId === member.openpaasId}
                >
                  <Icon icon={CrossCircleOutline} />
                </IconButton>
              </>
            ) : (
              <Typography variant="body2" color="textSecondary">
                {t('contacts.share.owner')}
              </Typography>
            )}
          </ListItem>
        ))
      ) : (
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
