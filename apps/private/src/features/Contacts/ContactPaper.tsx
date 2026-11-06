import { Contact } from '@common/features/Contacts/contactsTypes'
import { ContactAvatar } from './ContactAvatar'
import { EntryPaper } from './EntryPaper'

export function ContactPaper({
  contact
}: {
  contact: Pick<Contact, 'displayName' | 'emails'>
}): React.JSX.Element {
  return (
    <EntryPaper
      avatar={<ContactAvatar size="s" displayName={contact.displayName} />}
      primary={contact.displayName}
      secondary={contact.emails[0]?.value}
    />
  )
}
