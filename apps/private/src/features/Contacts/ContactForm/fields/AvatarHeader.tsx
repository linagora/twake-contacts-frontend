import { Grid, Typography, Avatar } from '@linagora/twake-mui'
import { getInitials } from '../../getInitials'

interface AvatarHeaderProps {
  displayName: string
  title: string
}

export const AvatarHeader: React.FC<AvatarHeaderProps> = ({
  displayName,
  title
}) => {
  return (
    <Grid container spacing={2}>
      <Grid>
        <Avatar size="xl">{getInitials(displayName)}</Avatar>
      </Grid>
      <Grid>
        <Typography variant="h4">{displayName || title}</Typography>
      </Grid>
    </Grid>
  )
}
