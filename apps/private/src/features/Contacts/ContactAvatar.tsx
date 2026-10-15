import {
  Avatar,
  AvatarProps,
  nameToColor,
  Typography,
  TypographyProps
} from '@linagora/twake-mui'
import { getInitials } from './getInitials'

interface ContactAvatarProps {
  displayName: string
  size: AvatarProps['size']
  src?: string
  /**
   * twake-mui sizes the initials at half the avatar diameter, which lets wide
   * initials such as "MW" touch the border of large avatars: a typography
   * variant renders them smaller instead.
   */
  initialsVariant?: TypographyProps['variant']
}

/**
 * Colour is derived from the full display name, like twake-mui's
 * ContactPopover, so a contact keeps the same avatar colour everywhere.
 */
export const ContactAvatar: React.FC<ContactAvatarProps> = ({
  displayName,
  size,
  src,
  initialsVariant
}) => {
  const initials = getInitials(displayName)

  return (
    <Avatar size={size} src={src} color={nameToColor(displayName) ?? 'sunrise'}>
      {initialsVariant ? (
        <Typography variant={initialsVariant} component="span" color="inherit">
          {initials}
        </Typography>
      ) : (
        initials
      )}
    </Avatar>
  )
}
