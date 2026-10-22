import { ListItem, ListItemAvatar, ListItemText, Paper } from '@mui/material'
import { IconButton, Tooltip } from '@linagora/twake-mui'
import { Cross, Icon } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'

interface EntryPaperProps {
  avatar: React.ReactNode
  primary: string
  secondary?: string
  onRemove?: () => void
}

export function EntryPaper({
  avatar,
  primary,
  secondary,
  onRemove
}: EntryPaperProps): JSX.Element {
  const { t } = useI18n()
  return (
    <Paper variant="outlined">
      <ListItem
        secondaryAction={
          onRemove && (
            <Tooltip disableInteractive title={t('contacts.form.remove')}>
              <IconButton
                aria-label={t('contacts.form.remove')}
                onClick={onRemove}
              >
                <Icon icon={Cross} />
              </IconButton>
            </Tooltip>
          )
        }
      >
        <ListItemAvatar className="u-miw-1">{avatar}</ListItemAvatar>
        <ListItemText primary={primary} secondary={secondary} />
      </ListItem>
    </Paper>
  )
}
