import {
  Avatar,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography
} from '@linagora/twake-mui'
import {
  Copy,
  Email,
  Icon,
  Left,
  Location,
  Matrix,
  People,
  Phone
} from '@linagora/twake-icons'
import { useAppSelector } from '@common/app/hooks'
import { ContactAddress } from '@common/features/Contacts/contactsTypes'
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
}

const ContactField: React.FC<ContactFieldProps> = ({
  icon,
  value,
  type,
  copyLabel
}) => {
  const handleCopy = (): void => {
    void navigator.clipboard.writeText(value)
  }
  return (
    <ListItem
      disableGutters
      secondaryAction={
        copyLabel && (
          <IconButton size="small" aria-label={copyLabel} onClick={handleCopy}>
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
  )
}

export const ContactPage: React.FC = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { addressBookId = '', contactId } = useParams()
  const contact = useAppSelector(
    state => state.contacts.addressBooks[addressBookId]?.contacts
  )?.find(c => c.id === contactId)
  const handleDeleted = (): void => navigate(`/contacts/${addressBookId}`)

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
            <Avatar size="xl">
              {getInitials(contact.displayName)}
            </Avatar>
            <Typography variant="h4">{contact.displayName}</Typography>
            <ContactActionsMenu
              contact={contact}
              addressBookId={addressBookId}
              onDeleted={handleDeleted}
            />
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
              />
            ))}
            {contact.emails.map(email => (
              <ContactField
                key={email.value}
                icon={Email}
                value={email.value}
                type={email.type}
                copyLabel={t('contacts.copy')}
              />
            ))}
            {contact.socialProfiles?.map(profile => (
              <ContactField
                key={profile.value}
                icon={Matrix}
                value={profile.value}
                type={profile.type}
                copyLabel={t('contacts.copy')}
              />
            ))}
            {contact.addresses?.map(address => (
              <ContactField
                key={formatAddress(address)}
                icon={Location}
                value={formatAddress(address)}
                type={address.type}
              />
            ))}
          </List>
        </>
      )}
    </Stack>
  )
}
