import { Stack, Typography, Tooltip, useBreakpoints } from '@linagora/twake-mui'
import { ContactAvatar } from '../../ContactAvatar'

interface AvatarHeaderProps {
  displayName: string
  title?: string
  // given by pages focusing their heading on arrival
  headingRef?: React.Ref<HTMLHeadingElement>
}

export const AvatarHeader: React.FC<AvatarHeaderProps> = ({
  displayName,
  title,
  headingRef
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
        <Typography
          variant="h4"
          component="h1"
          noWrap
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
        >
          {displayName || title || ''}
        </Typography>
      </Tooltip>
    </Stack>
  )
}
