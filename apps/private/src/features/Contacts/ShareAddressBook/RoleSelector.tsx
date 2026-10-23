import React, { useId, useRef, useState } from 'react'
import {
  ActionsMenu,
  ActionsMenuItem,
  Button,
  ListItemIcon,
  ListItemText
} from '@linagora/twake-mui'
import {
  Dropdown,
  Icon,
  RadioChecked,
  RadioUnchecked
} from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'
import { getRoleTranslationKey } from './sharingHelpers'

interface RoleSelectorProps {
  value: AddressBookAccessLevel
  onChange: (role: AddressBookAccessLevel) => void
  disabled?: boolean
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const { t } = useI18n()
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const roleKey = getRoleTranslationKey(value)
  const roles = [AddressBookAccessLevel.Editor, AddressBookAccessLevel.Viewer]
  // Only offer read-write for a sharee who already has it.
  if (value === AddressBookAccessLevel.ReadWrite) {
    roles.push(AddressBookAccessLevel.ReadWrite)
  }

  return (
    <>
      <Button
        ref={anchorRef}
        variant="text"
        size="small"
        color="inherit"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        endIcon={<Icon icon={Dropdown} />}
        onClick={() => setOpen(true)}
      >
        {roleKey ? t(roleKey) : ''}
      </Button>
      <ActionsMenu
        ref={anchorRef}
        id={menuId}
        open={open && !disabled}
        onClose={() => setOpen(false)}
      >
        {roles.map(role => (
          <ActionsMenuItem
            key={role}
            role="menuitemradio"
            aria-checked={value === role}
            onClick={() => onChange(role)}
          >
            <ListItemIcon>
              <Icon
                icon={value === role ? RadioChecked : RadioUnchecked}
                color={value === role ? 'primary' : 'inherit'}
              />
            </ListItemIcon>
            <ListItemText>{t(getRoleTranslationKey(role) || '')}</ListItemText>
          </ActionsMenuItem>
        ))}
      </ActionsMenu>
    </>
  )
}
