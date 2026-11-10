import { renderHook } from '@testing-library/react'
import { useDocumentTitle } from './useDocumentTitle'

describe('useDocumentTitle', () => {
  beforeEach(() => {
    document.title = 'Twake Contacts'
  })

  it('prefixes the product name with the page name', () => {
    renderHook(() => useDocumentTitle('My contacts'))
    expect(document.title).toBe('My contacts – Twake Contacts')
  })

  it('uses the product name alone without a page name', () => {
    document.title = 'Something else'
    renderHook(() => useDocumentTitle())
    expect(document.title).toBe('Twake Contacts')
  })

  it('follows the page name when it changes', () => {
    const { rerender } = renderHook(
      ({ page }: { page?: string }) => useDocumentTitle(page),
      { initialProps: { page: 'My contacts' } }
    )
    rerender({ page: 'Alice Roche' })
    expect(document.title).toBe('Alice Roche – Twake Contacts')
  })

  it('puts back the product name on unmount', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Edit contact'))
    unmount()
    expect(document.title).toBe('Twake Contacts')
  })
})
