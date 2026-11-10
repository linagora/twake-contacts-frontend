import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Message of a visually hidden live region, emptied after `clearAfterMs` so
 * a later identical message is announced again by screen readers.
 */
export const useLiveAnnouncement = (
  clearAfterMs: number
): { message: string; announce: (message: string) => void } => {
  const [message, setMessage] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )

  useEffect(() => (): void => clearTimeout(timeoutRef.current), [])

  const announce = useCallback(
    (newMessage: string) => {
      clearTimeout(timeoutRef.current)
      setMessage(newMessage)
      timeoutRef.current = setTimeout(() => setMessage(''), clearAfterMs)
    },
    [clearAfterMs]
  )

  return { message, announce }
}
