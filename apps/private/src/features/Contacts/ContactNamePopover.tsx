import { Box, ContactPopover } from '@linagora/twake-mui'
import React, { useEffect, useRef, useState } from 'react'

interface ContactNamePopoverProps {
  name: string
  email: string
  children: React.ReactNode
}

// The popover is portaled but React still bubbles its events (backdrop
// included) through the component tree, up to the row click handler that
// would open the contact owning the popover.
const stopPortaledClickPropagation = (event: React.MouseEvent): void => {
  if (!event.currentTarget.contains(event.target as Node)) {
    event.stopPropagation()
  }
}

// Closing the popover (Escape, backdrop click) removes its backdrop: the
// browser then sends a new mouseenter to the name still under the pointer,
// which would reopen the popover right away. Keep the hover opening off until
// the pointer has moved out of the name. The popover stays enabled: its
// trigger, the name button, stays in the page, so the popover gives the
// focus back to it after a keyboard opening.
const useHoverOffUntilPointerLeaves = (
  triggerRef: React.RefObject<HTMLElement | null>
): [boolean, () => void] => {
  const [hoverOff, setHoverOff] = useState(false)

  useEffect(() => {
    if (!hoverOff) return
    const enableOncePointerIsOutside = (event: MouseEvent): void => {
      if (!triggerRef.current?.contains(event.target as Node)) {
        setHoverOff(false)
      }
    }
    document.addEventListener('mousemove', enableOncePointerIsOutside)
    return () =>
      document.removeEventListener('mousemove', enableOncePointerIsOutside)
  }, [hoverOff, triggerRef])

  return [hoverOff, () => setHoverOff(true)]
}

export const ContactNamePopover: React.FC<ContactNamePopoverProps> = ({
  name,
  email,
  children
}) => {
  const triggerRef = useRef<HTMLDivElement>(null)
  const [hoverOff, turnHoverOff] = useHoverOffUntilPointerLeaves(triggerRef)

  return (
    <Box ref={triggerRef} onClick={stopPortaledClickPropagation}>
      <ContactPopover
        name={name}
        email={email}
        onClose={turnHoverOff}
        openOnHover={!hoverOff}
      >
        {children}
      </ContactPopover>
    </Box>
  )
}
