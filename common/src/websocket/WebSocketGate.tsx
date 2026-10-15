import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { api } from '@common/utils/apiUtils'
import { useCallback, useRef } from 'react'
import { parseMessage } from './messaging/parseMessage'
import { useSyncRegistrations } from './operations/useSyncRegistrations'
import { useWebSocketConnection } from '@linagora/twake-websocket'

export function WebSocketGate(): JSX.Element | null {
  const dispatch = useAppDispatch()

  const isAuthenticated = useAppSelector(state =>
    Boolean(state.user.userData && state.user.tokens)
  )

  const onMessage = useCallback(
    (message: unknown) => parseMessage(message, dispatch),
    [dispatch]
  )
  const delayedRefreshTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map())
  const dispose = useCallback(() => {
    delayedRefreshTimersRef.current.forEach(timer => clearTimeout(timer))
    delayedRefreshTimersRef.current.clear()
  }, [])

  const connection = useWebSocketConnection({
    enabled: isAuthenticated,
    url: window.WEBSOCKET_URL ?? '',
    api,
    onMessage: onMessage,
    onDisconnect: dispose,
    exposeOnWindow: true
  })

  useSyncRegistrations(connection)

  return null
}
