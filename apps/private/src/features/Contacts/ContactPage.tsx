import { useState } from 'react'
import {
  Alert,
  Avatar,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Stack,
  Typography
} from '@linagora/twake-mui'
import {
  CalendarToday,
  Discuss,
  Copy,
  Email,
  Icon,
  Left,
  Location,
  Matrix,
  People,
  Phone,
  CrossSmall
} from '@linagora/twake-icons'
import { useAppSelector } from '@common/app/hooks'
import { ContactAddress } from '@common/features/Contacts/contactsTypes'
import { openCalendarEvent } from '@common/utils/calendarSpaUrl'
import { openMailComposer } from '@common/utils/mailSpaUrl'
import { openChat } from '@common/utils/chatSpaUrl'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import { ContactActionsMenu } from './ContactActionsMenu'
import { getInitials } from './getInitials'

const formatAddress = (address: ContactAddress): string =>
  [address.street, address.postalCode, address.locality, address.country]
    .filter(Boolean)
    .join(', ')

interface ContactFieldProps {
  icon: React.ComponentType
  value: string
  type?: string | null
  copyLabel?: string
  copyToastMessage?: string
}

const ContactField: React.FC<ContactFieldProps> = ({
  icon,
  value,
  type,
  copyLabel,
  copyToastMessage
}) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const { t } = useI18n()

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(value)
    if (copyToastMessage) {
      setSnackbarOpen(true)
    }
  }

  const handleCloseSnackbar = (): void => {
    setSnackbarOpen(false)
  }

  return (
    <>
      <ListItem
        disableGutters
        secondaryAction={
          copyLabel && (
            <IconButton
              size="small"
              aria-label={copyLabel}
              onClick={handleCopy}
            >
              <Icon icon={Copy} />
            </IconButton>
          )
        }
      >
        <ListItemIcon>
          <Icon icon={icon} />
        </ListItemIcon>
        <ListItemText primary={value} />
        {type && (
          <Typography variant="body2" color="text.secondary">
            {type}
          </Typography>
        )}
      </ListItem>
      {copyToastMessage && (
        <Snackbar
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
        >
          <Alert
            severity="success"
            onClose={handleCloseSnackbar}
            sx={{ width: '100%' }}
            action={
              <IconButton
                size="small"
                aria-label={t('common.ok')}
                onClick={handleCloseSnackbar}
              >
                <Icon icon={CrossSmall} />
              </IconButton>
            }
          >
            {copyToastMessage}
          </Alert>
        </Snackbar>
      )}
    </>
  )
}

export const ContactPage: React.FC = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { addressBookId = '', contactId } = useParams()
  const contact = useAppSelector(
    state => state.contacts.addressBooks[addressBookId]?.contacts
  )?.find(c => c.id === contactId)
  const workplaceFqdn = useAppSelector(
    state => state.user.userData?.workplaceFqdn
  )
  const handleDeleted = (): void => void navigate(`/contacts/${addressBookId}`)

  const firstEmail = contact?.emails[0]?.value
  const matrixProfile = contact?.socialProfiles?.find(
    p => p.type?.toLowerCase() === 'matrix'
  )
  const chatTarget = matrixProfile?.value

  const handleSendMail = (): void => {
    if (!firstEmail) return
    openMailComposer(firstEmail, { workplaceFqdn })
  }

  const handleOpenChat = (): void => {
    if (!chatTarget) return
    openChat(chatTarget, { workplaceFqdn })
  }

  const handleCreateEvent = (): void => {
    if (!firstEmail) return
    openCalendarEvent(firstEmail, { workplaceFqdn })
  }

  return (
    <Stack spacing={3}>
      <Button
        component={Link}
        to={`/contacts/${addressBookId}`}
        variant="text"
        startIcon={<Icon icon={Left} />}
      >
        {t('contacts.back')}
      </Button>
      {!contact ? (
        <Typography color="text.secondary">{t('contacts.notFound')}</Typography>
      ) : (
        <>
          <Stack direction="row" spacing={2}>
            <Avatar size="xl">{getInitials(contact.displayName)}</Avatar>
            <Typography variant="h4">{contact.displayName}</Typography>
            <ContactActionsMenu
              contact={contact}
              addressBookId={addressBookId}
              onDeleted={handleDeleted}
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            {firstEmail && (
              <Button
                variant="contained"
                startIcon={<Icon icon={Email} />}
                aria-label={t('contacts.menu.mail')}
                data-testid="contact-mail-button"
                onClick={handleSendMail}
              >
                {t('contacts.menu.mail')}
              </Button>
            )}
            {chatTarget && (
              <Button
                variant="contained"
                aria-label={t('contacts.menu.chat')}
                data-testid="contact-chat-button"
                startIcon={<Icon icon={Discuss} />}
                onClick={handleOpenChat}
              >
                {t('contacts.menu.chat')}
              </Button>
            )}
            {firstEmail && (
              <Button
                variant="contained"
                aria-label={t('contacts.menu.calendar')}
                data-testid="contact-calendar-button"
                startIcon={<Icon icon={CalendarToday} />}
                onClick={handleCreateEvent}
              >
                {t('contacts.menu.calendar')}
              </Button>
            )}
          </Stack>
          <List>
            <Typography variant="h5" component="li" gutterBottom>
              {contact.displayName}
            </Typography>
            {contact.categories && (
              <ListItem disableGutters>
                <ListItemIcon>
                  <Icon icon={People} />
                </ListItemIcon>
                <Stack direction="row" spacing={1}>
                  {contact.categories.map(category => (
                    <Chip key={category} label={category} size="small" square />
                  ))}
                </Stack>
              </ListItem>
            )}
            {contact.phones?.map(phone => (
              <ContactField
                key={phone.value}
                icon={Phone}
                value={phone.value}
                type={phone.type}
                copyLabel={t('contacts.copy')}
                copyToastMessage={t('contacts.phoneWasCopied')}
              />
            ))}
            {contact.emails.map(email => (
              <ContactField
                key={email.value}
                icon={Email}
                value={email.value}
                type={email.type}
                copyLabel={t('contacts.copy')}
                copyToastMessage={t('contacts.emailWasCopied')}
              />
            ))}
            {contact.socialProfiles?.map(profile => (
              <ContactField
                key={profile.value}
                icon={Matrix}
                value={profile.value}
                type={profile.type}
                copyLabel={t('contacts.copy')}
                copyToastMessage={t('contacts.socialProfileWasCopied')}
              />
            ))}
            {contact.addresses?.map(address => (
              <ContactField
                key={formatAddress(address)}
                icon={Location}
                value={formatAddress(address)}
                type={address.type}
                copyToastMessage={t('contacts.addressWasCopied')}
              />
            ))}
          </List>
        </>
      )}
    </Stack>
  )
}
