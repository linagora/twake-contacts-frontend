import React from 'react'
import {
  DropdownText,
  ListItem,
  ListItemButton,
  ListItemSecondaryAction
} from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { CreateAddressBookButton } from './CreateAddressBookButton'

export interface SharedSectionHeaderProps {
  isFoldable: boolean
  isExpanded: boolean
  booksListId: string
  onToggle: () => void
  onOpenSubscribe: () => void
}

/**
 * "Shared" caption: a button folding the shared books when there are some,
 * with the "+" adding a shared book as a separate button next to it.
 */
export const SharedSectionHeader: React.FC<SharedSectionHeaderProps> = ({
  isFoldable,
  isExpanded,
  booksListId,
  onToggle,
  onOpenSubscribe
}) => {
  const { t } = useI18n()

  const subscribeButton = (
    <ListItemSecondaryAction>
      <CreateAddressBookButton
        onClick={onOpenSubscribe}
        label={t('contacts.addressBook.subscribeTitle')}
      />
    </ListItemSecondaryAction>
  )

  if (!isFoldable) {
    return (
      <ListItem size="small">
        <DropdownText
          variant="caption"
          color="textSecondary"
          innerIconContainerProps={{ display: 'none' }}
        >
          {t('contacts.shared')}
        </DropdownText>
        {subscribeButton}
      </ListItem>
    )
  }

  return (
    <ListItemButton
      size="small"
      aria-expanded={isExpanded}
      aria-controls={booksListId}
      onClick={onToggle}
    >
      <DropdownText
        variant="caption"
        color="textSecondary"
        spaceBetween
        innerIconContainerProps={{ 'aria-hidden': true }}
        innerIconProps={{ rotate: isExpanded ? 0 : -90 }}
      >
        {t('contacts.shared')}
      </DropdownText>
      {subscribeButton}
    </ListItemButton>
  )
}
