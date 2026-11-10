import React from 'react'
import { Icon, PlusSmall } from '@linagora/twake-icons'
import { IconButton, Tooltip } from '@linagora/twake-mui'

export interface CreateAddressBookButtonProps {
  onClick: () => void
  label: string
}

export const CreateAddressBookButton: React.FC<
  CreateAddressBookButtonProps
> = ({ onClick, label }) => {
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        aria-label={label}
        onClick={e => {
          e.stopPropagation()
          onClick()
        }}
      >
        <Icon icon={PlusSmall} size={16} />
      </IconButton>
    </Tooltip>
  )
}
