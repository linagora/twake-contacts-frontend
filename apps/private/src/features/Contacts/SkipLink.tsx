import { Fab } from '@linagora/twake-mui'
import { useState } from 'react'
import { useI18n } from 'twake-i18n'

interface SkipLinkProps {
  targetId: string
}

/**
 * First stop of the Tab order, hidden until it gets the focus. A Fab, whose
 * z-index keeps it above the content on every breakpoint.
 */
export const SkipLink: React.FC<SkipLinkProps> = ({ targetId }) => {
  const { t } = useI18n()
  const [isFocused, setIsFocused] = useState(false)

  return (
    <Fab
      variant="extended"
      size="medium"
      color="primary"
      href={`#${targetId}`}
      className={
        isFocused ? 'u-pos-fixed u-top-xs u-left-xs' : 'u-visuallyhidden'
      }
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onClick={(event: React.MouseEvent) => {
        // the router owns the URL: move the focus without a hash navigation
        event.preventDefault()
        document.getElementById(targetId)?.focus()
      }}
    >
      {t('contacts.nav.skipToContent')}
    </Fab>
  )
}
