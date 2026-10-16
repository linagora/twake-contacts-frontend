import { ContactList } from '@linagora/twake-icons'
import {
  NavDropdown,
  NavIcon,
  NavItem,
  NavLink,
  NavText
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { CreateAddressBookButton } from './CreateAddressBookButton'
import { getAriaCurrent } from './sidebarHelpers'

export interface MyContactsNavItemProps {
  hasBooks: boolean
  isExpanded: boolean
  isSelected: boolean
  onToggle: () => void
  onNavigate: () => void
  onOpenCreateBook: () => void
}

export const MyContactsNavItem: React.FC<MyContactsNavItemProps> = ({
  hasBooks,
  isExpanded,
  isSelected,
  onToggle,
  onNavigate,
  onOpenCreateBook
}) => {
  const { t } = useI18n()

  return (
    <NavItem
      secondaryAction={
        <CreateAddressBookButton
          onClick={onOpenCreateBook}
          label={t('contacts.addressBook.createTitle')}
        />
      }
    >
      {hasBooks ? (
        <NavDropdown
          open={isExpanded}
          onToggle={onToggle}
          selected={isSelected}
          aria-current={getAriaCurrent(isSelected)}
          onClick={onNavigate}
        >
          <NavIcon icon={ContactList} />
          <NavText>{t('contacts.myContacts')}</NavText>
        </NavDropdown>
      ) : (
        <NavLink
          selected={isSelected}
          aria-current={getAriaCurrent(isSelected)}
          onClick={onNavigate}
        >
          <NavIcon icon={ContactList} />
          <NavText>{t('contacts.myContacts')}</NavText>
        </NavLink>
      )}
    </NavItem>
  )
}
