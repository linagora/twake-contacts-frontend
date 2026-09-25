import { Stack, Typography, Avatar } from '@linagora/twake-mui'
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
      <Avatar size={94}>{getInitials(displayName)}</Avatar>
      <Typography variant="h4">{displayName || title || ''}</Typography>
    </Stack>
  )
}
