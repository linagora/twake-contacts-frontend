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
        select: `${props.classes?.select || ''} u-mr-1`.trim()
      }}
    >
      <MenuItem value={AddressBookAccessLevel.Viewer}>
        {t('contacts.share.viewer')}
      </MenuItem>
      {/* read-write is not offered by the app, only shown for a sharee who has it */}
      {props.value === AddressBookAccessLevel.ReadWrite && (
        <MenuItem value={AddressBookAccessLevel.ReadWrite}>
          {t('contacts.share.readWrite')}
        </MenuItem>
      )}
      <MenuItem value={AddressBookAccessLevel.Editor}>
        {t('contacts.share.editor')}
      </MenuItem>
    </Select>
  )
}
