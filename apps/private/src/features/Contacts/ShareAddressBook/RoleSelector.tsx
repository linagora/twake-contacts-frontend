import React from 'react'
import { Select, MenuItem, SelectProps } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { AddressBookAccessLevel } from '@common/features/Contacts/davTypes'

export const RoleSelector: React.FC<SelectProps> = props => {
  const { t } = useI18n()

  return (
    <Select
      variant="standard"
      disableUnderline
      {...props}
      classes={{
        ...props.classes,
        select: `${props.classes?.select || ''} u-pr-3`.trim()
      }}
    >
      <MenuItem value={AddressBookAccessLevel.Viewer}>
        {t('contacts.share.viewer')}
      </MenuItem>
      <MenuItem value={AddressBookAccessLevel.Editor}>
        {t('contacts.share.editor')}
      </MenuItem>
    </Select>
  )
}
