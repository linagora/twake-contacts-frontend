import React from 'react'
import { Icon, Plus } from '@linagora/twake-icons'
import { IconButton, Tooltip } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

export interface CreateAddressBookButtonProps {
  onClick: () => void
}

export const CreateAddressBookButton: React.FC<
  CreateAddressBookButtonProps
> = ({ onClick }) => {
  const { t } = useI18n()
  return (
    <Tooltip title={t('contacts.addressBook.createTitle')}>
      <IconButton
        size="xsmall"
        aria-label={t('contacts.addressBook.createTitle')}
        onClick={e => {
          e.stopPropagation()
          onClick()
        }}
      >
        <Icon icon={Plus} size={14} />
      </IconButton>
    </Tooltip>
  )
}
