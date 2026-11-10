import { act, renderHook } from '@testing-library/react'
import { useLiveAnnouncement } from './useLiveAnnouncement'

describe('useLiveAnnouncement', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('empties the message once the delay elapsed', () => {
    const { result } = renderHook(() => useLiveAnnouncement(5000))

    act(() => result.current.announce('Shared with bob bob'))
    expect(result.current.message).toBe('Shared with bob bob')

    act(() => vi.advanceTimersByTime(4999))
    expect(result.current.message).toBe('Shared with bob bob')

    act(() => vi.advanceTimersByTime(1))
    expect(result.current.message).toBe('')
  })

  it('keeps a new message for the whole delay', () => {
    const { result } = renderHook(() => useLiveAnnouncement(5000))

    act(() => result.current.announce('first'))
    act(() => vi.advanceTimersByTime(4000))
    act(() => result.current.announce('second'))
    act(() => vi.advanceTimersByTime(4000))

    expect(result.current.message).toBe('second')
  })
})
