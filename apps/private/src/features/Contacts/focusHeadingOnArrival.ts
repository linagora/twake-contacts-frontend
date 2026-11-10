import { useCallback, useRef } from 'react'
import { useLocation } from 'react-router'

export interface FocusHeadingState {
  focusHeading?: boolean
}

// Navigation state asking the page reached to focus its heading: after an
// action whose control disappears with its page (Save, Delete), the heading
// takes the focus and its name is read out, instead of the focus falling to
// the page body.
export const FOCUS_HEADING_STATE: FocusHeadingState = { focusHeading: true }

const isFocusHeadingState = (state: unknown): boolean =>
  (state as FocusHeadingState | null)?.focusHeading === true

// Ref for the page heading: focuses it once per navigation carrying
// FOCUS_HEADING_STATE, as soon as it is rendered (pages show a skeleton while
// loading). The heading needs tabIndex={-1} to take the focus.
export const useFocusHeadingOnArrival = <T extends HTMLElement>(): ((
  element: T | null
) => void) => {
  const location = useLocation()
  const focusRequested = isFocusHeadingState(location.state)
  const focusedForKey = useRef<string | null>(null)

  return useCallback(
    (element: T | null) => {
      if (!element || !focusRequested) return
      if (focusedForKey.current === location.key) return
      focusedForKey.current = location.key
      element.focus()
    },
    [focusRequested, location.key]
  )
}
