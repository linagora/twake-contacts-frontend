import { Grid, Typography, Avatar } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { getInitials } from '../../getInitials'

interface AvatarHeaderProps {
  displayName: string
}

export const AvatarHeader: React.FC<AvatarHeaderProps> = ({ displayName }) => {
  const { t } = useI18n()
  return (
    <Grid container spacing={2}>
      <Grid>
        <Avatar size="xl">{getInitials(displayName)}</Avatar>
      </Grid>
      <Grid>
        <Typography variant="h4">
          {displayName || t('contacts.form.newContact')}
        </Typography>
      </Grid>
    </Grid>
  )
}
