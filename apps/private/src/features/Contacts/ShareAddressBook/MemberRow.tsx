import React from 'react'
import {
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  Tooltip,
  Stack
} from '@linagora/twake-mui'
import { Icon, CrossCircleOutline } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { userData } from '@common/features/User/userDataTypes'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { getInitials } from '../getInitials'
import { RoleSelector } from './RoleSelector'
import { getRoleTranslationKey } from './sharingHelpers'

export interface MemberRowProps {
  member: userData
  isCurrentUser?: boolean
  onUpdateMember?: (user: userData, role: AddressBookAccessLevel) => void
  isUpdating?: boolean
}

export const MemberRow: React.FC<MemberRowProps> = ({
  member,
  isCurrentUser = false,
  onUpdateMember,
  isUpdating = false
}) => {
  const { t } = useI18n()

  const displayName = isCurrentUser ? t('contacts.share.you') : member.name
  const roleKey = getRoleTranslationKey(member.role)

  return (
    <ListItem dense disableGutters>
      <ListItemAvatar className="u-miw-1">
        <Avatar>{getInitials(member.name)}</Avatar>
      </ListItemAvatar>
      <ListItemText primary={displayName} secondary={member.email} />
      {isCurrentUser ? (
        <Typography variant="body2" color="textSecondary">
          {roleKey ? t(roleKey) : ''}
        </Typography>
      ) : member.role === AddressBookAccessLevel.Owner ? (
        <Typography variant="body2" color="textSecondary">
          {t('contacts.share.owner')}
        </Typography>
      ) : (
        <Stack direction="row">
          <RoleSelector
            value={member.role || AddressBookAccessLevel.Viewer}
            onChange={role => onUpdateMember?.(member, role)}
            disabled={isUpdating}
          />
          <Tooltip disableInteractive title={t('contacts.form.remove')}>
            <IconButton
              size="small"
              onClick={() =>
                onUpdateMember?.(member, AddressBookAccessLevel.None)
              }
              disabled={isUpdating}
            >
              <Icon icon={CrossCircleOutline} />
            </IconButton>
          </Tooltip>
        </Stack>
      )}
    </ListItem>
  )
}
