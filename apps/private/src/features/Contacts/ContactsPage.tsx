import {
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Typography
} from '@linagora/twake-mui'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { fetchContacts } from '@common/features/Contacts/ContactsSlice'
import { useI18n } from 'twake-i18n'
import { useEffect } from 'react'

export const ContactsPage: React.FC = () => {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const contacts = useAppSelector(state => state.contacts.contacts)
  const loading = useAppSelector(state => state.contacts.loading)
  const error = useAppSelector(state => state.contacts.error)

  useEffect(() => {
    if (openpaasId) {
      void dispatch(fetchContacts(openpaasId))
    }
  }, [openpaasId, dispatch])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'background.default',
        p: 3
      }}
    >
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('contacts.title')}
      </Typography>

      {loading && <CircularProgress />}

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {!loading && !error && (
        <Box sx={{ width: '100%', maxWidth: 600 }}>
          {contacts.length === 0 ? (
            <Typography color="text.secondary">No contacts</Typography>
          ) : (
            <List>
              {contacts.map(contact => (
                <ListItem
                  key={contact.id}
                  divider
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                  }}
                >
                  <ListItemText
                    primary={contact.displayName}
                    secondary={contact.email ?? undefined}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}
    </Box>
  )
}

export default ContactsPage
