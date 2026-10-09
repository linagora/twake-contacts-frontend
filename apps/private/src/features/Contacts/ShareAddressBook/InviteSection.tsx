import React, { useState, useMemo } from 'react'
import {
  Stack,
  Typography,
  Button,
  TextField,
  Box,
  InputAdornment,
  Chip,
  Avatar
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { RoleSelector } from './RoleSelector'
import { searchUsers } from '@common/features/User/UserDao'
import { ToUserData } from '@common/features/User/type/OpenPaasUserData'
import { userData } from '@common/features/User/userDataTypes'
import { UserSearch } from '@common/components/Common/UserSearch'
import { getInitials } from '../getInitials'

interface InviteSectionProps {
  invitedMembers?: userData[]
  onShare: (users: userData[], role: AddressBookAccessLevel) => void
  loading?: boolean
}

export const InviteSection: React.FC<InviteSectionProps> = ({
  invitedMembers = [],
  onShare,
  loading = false
}) => {
  const { t } = useI18n()

  // Selected users to invite (since Autocomplete is multiple)
  const [selectedUsers, setSelectedUsers] = useState<userData[]>([])
  const [selectedRole, setSelectedRole] = useState(
    AddressBookAccessLevel.Viewer
  )

  const excludes = useMemo(() => {
    return invitedMembers.map(m => m.openpaasId).filter(Boolean) as string[]
  }, [invitedMembers])

  return (
    <Stack spacing={1} className="u-mt-1">
      <Typography variant="body2">
        {t('contacts.share.invitePeople')}
      </Typography>
      <Stack direction="row" className="u-flex-items-center">
        <Box className="u-flex-auto">
          <UserSearch
            multiple
            fetchOptions={async search => {
              const users = await searchUsers(search, excludes)
              const selectedIds = new Set(selectedUsers.map(u => u.openpaasId))
              return users
                .map(ToUserData)
                .filter(
                  (user): user is userData =>
                    user != null && !selectedIds.has(user.openpaasId)
                )
            }}
            getOptionLabel={option => option.name || option.email || ''}
            value={selectedUsers}
            onChange={(_event, newValue) => {
              setSelectedUsers(newValue as userData[])
            }}
            clearOnSelect={true}
            isOptionEqualToValue={(option, value) =>
              option.openpaasId === value.openpaasId
            }
            getOptionName={option => option.name || ''}
            getOptionEmail={option => option.email || ''}
            getOptionKey={option => option.openpaasId ?? ''}
            renderValue={(value: userData[], getItemProps): React.ReactNode =>
              value.map((option, index) => {
                const { key, ...tagProps } = getItemProps({ index })
                return (
                  <Chip
                    key={key}
                    variant="outlined"
                    avatar={
                      <Avatar size="xs">{getInitials(option.name)}</Avatar>
                    }
                    label={option.name}
                    {...tagProps}
                  />
                )
              })
            }
            renderInput={params => (
              <TextField
                {...params}
                placeholder={t('contacts.share.addContacts')}
                slotProps={{
                  ...params.slotProps,
                  input: {
                    ...params.slotProps?.input,
                    endAdornment: (
                      <InputAdornment
                        position="end"
                        style={{ position: 'absolute', right: 8 }}
                      >
                        <RoleSelector
                          value={selectedRole}
                          onChange={e =>
                            setSelectedRole(
                              e.target.value as AddressBookAccessLevel
                            )
                          }
                        />
                      </InputAdornment>
                    )
                  }
                }}
              />
            )}
          />
        </Box>
        <Button
          className="u-ml-1"
          variant="contained"
          color="primary"
          disabled={selectedUsers.length === 0 || loading}
          onClick={() => {
            onShare(selectedUsers, selectedRole)
            setSelectedUsers([])
            setSelectedRole(AddressBookAccessLevel.Viewer)
          }}
        >
          {t('contacts.share.send')}
        </Button>
      </Stack>
    </Stack>
  )
}
