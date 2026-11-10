import { Stack, Typography, Tooltip, useBreakpoints } from '@linagora/twake-mui'
import { ContactAvatar } from '../../ContactAvatar'

interface AvatarHeaderProps {
  displayName: string
  title?: string
}

export const AvatarHeader: React.FC<AvatarHeaderProps> = ({
  displayName,
  title
}) => {
  const { isMobile } = useBreakpoints()
  return (
    <Stack
      direction={isMobile ? 'column' : 'row'}
      spacing={2}
      className="u-flex u-flex-items-center"
    >
      <ContactAvatar size={94} initialsVariant="h2" displayName={displayName} />
      <Tooltip title={displayName || title || ''}>
        <Typography variant="h4" noWrap>
          {displayName || title || ''}
        </Typography>
      </Tooltip>
    </Stack>
  )
}
