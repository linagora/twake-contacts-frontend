import { Children, ReactElement, isValidElement, useId } from 'react'
import {
  List,
  ListItemText,
  ListSubheader,
  ListSubheaderProps,
  MenuItem,
  MenuList,
  MenuListProps
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import {
  isOwnAddressBook,
  isSharedAddressBook
} from '@common/features/Contacts/addressBookModel'
import { AddressBook } from '@common/features/Contacts/contactsTypes'
import {
  getAddressBookDisplayName,
  sortAddressBooks
} from '@common/features/Contacts/contactsUtils'

// Select clones every child as an option: restore the caption semantics
// once its props are applied so the group label is not announced as a choice
const GroupCaption: React.FC<ListSubheaderProps> = ({
  role: _role,
  'aria-selected': _ariaSelected,
  ...props
}) => <ListSubheader {...props} component="div" role="presentation" />

interface OptionGroup {
  caption: ReactElement<ListSubheaderProps>
  options: React.ReactNode[]
}

const isCaption = (
  child: React.ReactNode
): child is ReactElement<ListSubheaderProps> =>
  isValidElement(child) && child.type === GroupCaption

// Select only reads its direct children: the options stay flat for it, and
// each caption and the options following it are wrapped in a group labelled
// by that caption once rendered in the list
const toGroups = (children: React.ReactNode): OptionGroup[] =>
  Children.toArray(children).reduce<OptionGroup[]>(
    (groups, child) =>
      isCaption(child)
        ? [...groups, { caption: child, options: [] }]
        : groups.map((group, index) =>
            index === groups.length - 1
              ? { ...group, options: [...group.options, child] }
              : group
          ),
    []
  )

const GroupedMenuList: React.FC<MenuListProps> = ({ children, ...props }) => (
  <MenuList {...props}>
    {toGroups(children).map(({ caption, options }) => (
      <li key={caption.key} role="presentation">
        {caption}
        <List disablePadding role="group" aria-labelledby={caption.props.id}>
          {options}
        </List>
      </li>
    ))}
  </MenuList>
)

// Menu props of an address book select, rendering its options in groups
export const addressBookMenuProps = { slots: { list: GroupedMenuList } }

// Options of an address book select, with the same grouping as the sidebar:
// own books, then the books shared with the user; the domain book is never
// listed. Returned as a flat array since Select only reads its direct children:
// render them with addressBookMenuProps to expose each set as a group
export const useAddressBookOptions = (
  addressBooks: AddressBook[]
): React.ReactNode[] => {
  const { t } = useI18n()
  const ownCaptionId = useId()
  const sharedCaptionId = useId()
  const sortedBooks = sortAddressBooks(addressBooks, t)
  const ownBooks = sortedBooks.filter(isOwnAddressBook)
  const sharedBooks = sortedBooks.filter(isSharedAddressBook)

  const renderOption = (book: AddressBook): React.ReactNode => (
    <MenuItem key={book.id} value={book.id}>
      <ListItemText
        primary={getAddressBookDisplayName(book, t)}
        secondary={book.ownerDisplayName}
      />
    </MenuItem>
  )

  return [
    <GroupCaption
      key="own-caption"
      id={ownCaptionId}
      className="u-visuallyhidden"
    >
      {t('contacts.myContacts')}
    </GroupCaption>,
    ...ownBooks.map(renderOption),
    ...(sharedBooks.length > 0
      ? [
          <GroupCaption key="shared-caption" id={sharedCaptionId}>
            {t('contacts.shared')}
          </GroupCaption>
        ]
      : []),
    ...sharedBooks.map(renderOption)
  ]
}
