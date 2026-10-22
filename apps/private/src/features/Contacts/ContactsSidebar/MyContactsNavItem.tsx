import { ContactList, Dropdown, Icon } from '@linagora/twake-icons'
import {
  IconButton,
  NavIcon,
  NavItem,
  NavLink,
  NavText,
  Tooltip,
  useTheme
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
  const theme = useTheme()
  const toggleLabel = t(isExpanded ? 'contacts.collapse' : 'contacts.expand')

  return (
    <NavItem
      secondaryAction={
        <CreateAddressBookButton
          onClick={onOpenCreateBook}
          label={t('contacts.addressBook.createTitle')}
        />
      }
    >
      <NavLink
        selected={isSelected}
        aria-current={getAriaCurrent(isSelected)}
        aria-expanded={hasBooks ? isExpanded : undefined}
        onClick={onNavigate}
      >
        <NavIcon icon={ContactList} />
        <NavText>{t('contacts.myContacts')}</NavText>
        {/* Not NavDropdown: its chevron toggle has no tooltip */}
        {hasBooks && (
          <Tooltip disableInteractive title={toggleLabel}>
            <IconButton
              className="u-ml-half"
              size="xsmall"
              aria-label={toggleLabel}
              aria-expanded={isExpanded}
              onClick={e => {
                e.stopPropagation()
                onToggle()
              }}
            >
              <Icon
                icon={Dropdown}
                rotate={isExpanded ? 0 : -90}
                size={14}
                color={theme.vars.palette.text.primary}
              />
            </IconButton>
          </Tooltip>
        )}
      </NavLink>
    </NavItem>
  )
}
