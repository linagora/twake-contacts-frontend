import React from 'react'
import { Dots, Icon } from '@linagora/twake-icons'
import { IconButton, Tooltip } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { AddressBookActions } from './useAddressBookActions'

export interface AddressBookMoreActionsButtonProps {
  actions: AddressBookActions
}

/** The "⋮" button opening the menu of the actions on a book. */
export const AddressBookMoreActionsButton: React.FC<
  AddressBookMoreActionsButtonProps
> = ({ actions }) => {
  const { t } = useI18n()
  return (
    <>
      <Tooltip title={t('contacts.menu.more')}>
        <IconButton
          size="medium"
          aria-label={t('contacts.menu.more')}
          aria-haspopup="menu"
          aria-expanded={actions.isMenuOpen}
          onClick={actions.openMenu}
        >
          <Icon icon={Dots} rotate={90} />
        </IconButton>
      </Tooltip>
      {actions.menu}
    </>
  )
}
