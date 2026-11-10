import React from 'react'
import { Dropdown, Icon } from '@linagora/twake-icons'
import { IconButton, Tooltip } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

export interface CollapseToggleButtonProps {
  isExpanded: boolean
  controlsId: string
  onToggle: () => void
}

/** Chevron folding the nested list `controlsId`, separate from the entry it follows */
export const CollapseToggleButton: React.FC<CollapseToggleButtonProps> = ({
  isExpanded,
  controlsId,
  onToggle
}) => {
  const { t } = useI18n()
  const label = t(
    isExpanded ? 'contacts.sidebar.collapse' : 'contacts.sidebar.expand'
  )

  return (
    <Tooltip disableInteractive title={label}>
      <IconButton
        size="xsmall"
        aria-label={label}
        aria-expanded={isExpanded}
        aria-controls={controlsId}
        onClick={e => {
          e.stopPropagation()
          onToggle()
        }}
      >
        <Icon icon={Dropdown} rotate={isExpanded ? 0 : -90} size={14} />
      </IconButton>
    </Tooltip>
  )
}
