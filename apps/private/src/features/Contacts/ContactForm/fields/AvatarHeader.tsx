import { Stack, Typography, Avatar, Tooltip } from '@linagora/twake-mui'
import { getInitials } from '../../getInitials'

interface AvatarHeaderProps {
  displayName: string
  title?: string
}

export const AvatarHeader: React.FC<AvatarHeaderProps> = ({
  displayName,
  title
}) => {
  return (
    <Stack direction="row" spacing={2} className="u-flex u-flex-items-center">
      <Avatar size={94} color={displayName ? undefined : 'sunrise'}>
        {getInitials(displayName)}
      </Avatar>
      <Tooltip title={displayName || title || ''}>
        <Typography variant="h4" noWrap>
          {displayName || title || ''}
        </Typography>
      </Tooltip>
    </Stack>
  )
}
