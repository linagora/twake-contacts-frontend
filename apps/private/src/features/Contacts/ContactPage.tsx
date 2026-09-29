import { useAppSelector } from '@common/app/hooks'
import { ContactAddress } from '@common/features/Contacts/contactsTypes'
import { isHiddenAddressBook } from '@common/features/Contacts/contactsUtils'
import { openCalendarEvent } from '@common/utils/calendarSpaUrl'
import { openChat } from '@common/utils/chatSpaUrl'
import { openMailComposer } from '@common/utils/mailSpaUrl'
import {
  CalendarToday,
  Copy,
  CrossSmall,
  Discuss,
  Email,
  EmailOpen,
  Icon,
  Label,
  Left,
  Location,
  Matrix,
  Telephone
} from '@linagora/twake-icons'
import {
  Alert,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Stack,
  Tooltip,
  Typography
} from '@linagora/twake-mui'
import { useState } from 'react'

import { Link, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from 'twake-i18n'
import { ContactActionsMenu } from './ContactActionsMenu'
import { AvatarHeader } from './ContactForm/fields/AvatarHeader'

const formatAddress = (address: ContactAddress): string =>
  [
    address.address,
    address.street,
    address.postalCode,
    address.locality,
    address.country
  ]
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
        className="u-flex u-flex-items-center"
        style={{ width: 'fit-content', maxWidth: '50%' }}
      >
        <ListItemIcon>
          <Icon icon={icon} />
        </ListItemIcon>
        <ListItemText
          primary={value}
          slotProps={{ primary: { noWrap: true } }}
        />
        <div className="u-flex u-flex-items-center u-row-xs u-ml-auto u-ml-1">
          {type && (
            <Typography variant="body2" color="text.secondary">
              {type}
            </Typography>
          )}
          {copyLabel && (
            <Tooltip title={copyLabel}>
              <IconButton aria-label={copyLabel} onClick={handleCopy}>
                <Icon icon={Copy} size={24} />
              </IconButton>
            </Tooltip>
          )}
        </div>
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
  const handleDeleted = (): void =>
    void navigate(
      isHiddenAddressBook(addressBookId)
        ? '/contacts'
        : `/contacts/${addressBookId}`
    )

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
      <Stack direction="row" className="u-flex u-flex-justify-between">
        <Button
          component={Link}
          to={
            isHiddenAddressBook(addressBookId)
              ? '/contacts'
              : `/contacts/${addressBookId}`
          }
          variant="text"
          startIcon={<Icon icon={Left} />}
        >
          {t('contacts.back')}
        </Button>
        {contact && (
          <ContactActionsMenu
            contact={contact}
            addressBookId={addressBookId ?? ''}
            onDeleted={handleDeleted}
            readOnly={addressBookId === 'dab'}
          />
        )}
      </Stack>
      {!contact ? (
        <Typography color="text.secondary">{t('contacts.notFound')}</Typography>
      ) : (
        <>
          <AvatarHeader displayName={contact.displayName} />
          <Stack direction="row" spacing={2}>
            {firstEmail && (
              <Button
                variant="ghost"
                startIcon={<Icon icon={EmailOpen} />}
                aria-label={t('contacts.menu.mail')}
                data-testid="contact-mail-button"
                onClick={handleSendMail}
              >
                {t('contacts.menu.mail')}
              </Button>
            )}
            {chatTarget && (
              <Button
                variant="ghost"
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
                variant="ghost"
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
            {contact.categories && (
              <ListItem disableGutters>
                <ListItemIcon>
                  <Icon icon={Label} />
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
                icon={Telephone}
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
                copyLabel={t('contacts.copy')}
                copyToastMessage={t('contacts.emailWasCopied')}
              />
            ))}
            {contact.socialProfiles
              ?.filter(profile => profile.type === 'matrix')
              .map(profile => (
                <ContactField
                  key={profile.value}
                  icon={Matrix}
                  value={profile.value}
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
