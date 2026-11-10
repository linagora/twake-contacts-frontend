import { useEffect } from 'react'

export const APP_TITLE = 'Twake Contacts'

export const makeDocumentTitle = (page?: string): string =>
  page ? `${page} – ${APP_TITLE}` : APP_TITLE

/**
 * Names the screen in the browser tab, the window and what screen readers
 * announce: "<page> – Twake Contacts", or the product name alone.
 */
export const useDocumentTitle = (page?: string): void => {
  useEffect(() => {
    document.title = makeDocumentTitle(page)
  }, [page])

  useEffect(
    () => () => {
      document.title = APP_TITLE
    },
    []
  )
}
