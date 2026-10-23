import React from 'react'
import {
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
  Switch
} from '@linagora/twake-mui'
import { Icon, ManageSearch } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { useDiscoverySection } from './useDiscoverySection'

interface DiscoverySectionProps {
  userId: string | undefined
  addressBookId: string | undefined
}

export const DiscoverySection: React.FC<DiscoverySectionProps> = ({
  userId,
  addressBookId
}) => {
  const { t } = useI18n()
  const { isPublic, isDisabled, handleToggle } = useDiscoverySection({
    userId,
    addressBookId
  })

  return (
    <Stack spacing={1} className="u-mt-2">
      <Typography variant="body2">
        {t('contacts.share.discovery.title')}
      </Typography>
      <ListItem disableGutters>
        <ListItemAvatar className="u-miw-1">
          <Avatar className="u-bg-secondaryColorLight u-o-30">
            <Icon icon={ManageSearch} width={20} height={20} color="inherit" />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          disableTypography
          primary={
            <Typography variant="body2">
              {t('contacts.share.discovery.description')}
            </Typography>
          }
        />
        <Switch
          checked={isPublic ?? false}
          onChange={(e, checked) => void handleToggle(e, checked)}
          disabled={isDisabled}
          slotProps={{
            input: { 'aria-label': t('contacts.share.discovery.toggleTooltip') }
          }}
        />
      </ListItem>
    </Stack>
  )
}
