import { ContactList } from '@linagora/twake-icons'
import { NavIcon, NavItem, NavLink, NavText } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { CollapseToggleButton } from './CollapseToggleButton'
import { CreateAddressBookButton } from './CreateAddressBookButton'
import { getAriaCurrent } from './sidebarHelpers'

export interface MyContactsNavItemProps {
  hasBooks: boolean
  isExpanded: boolean
  isSelected: boolean
  booksListId: string
  onToggle: () => void
  onNavigate: () => void
  onOpenCreateBook: () => void
}

export const MyContactsNavItem: React.FC<MyContactsNavItemProps> = ({
  hasBooks,
  isExpanded,
  isSelected,
  booksListId,
  onToggle,
  onNavigate,
  onOpenCreateBook
}) => {
  const { t } = useI18n()

  return (
    <NavItem
      secondaryAction={
        <>
          {hasBooks && (
            <CollapseToggleButton
              isExpanded={isExpanded}
              controlsId={booksListId}
              onToggle={onToggle}
            />
          )}
          <CreateAddressBookButton
            onClick={onOpenCreateBook}
            label={t('contacts.addressBook.createTitle')}
          />
        </>
      }
    >
      <NavLink
        selected={isSelected}
        aria-current={getAriaCurrent(isSelected)}
        onClick={onNavigate}
      >
        <NavIcon icon={ContactList} />
        <NavText>{t('contacts.myContacts')}</NavText>
      </NavLink>
    </NavItem>
  )
}
