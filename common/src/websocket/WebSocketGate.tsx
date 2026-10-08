import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  closeWebSocketConnection,
  establishWebSocketConnection,
  setupWebSocketPing,
  type WebSocketWithCleanup,
  useWebSocketReconnect,
  registerWebSocketState,
  setWebSocketConnecting
} from '@linagora/twake-websocket'
import { api } from '@common/utils/apiUtils'
import { useSyncRegistrations } from './operations/useSyncRegistrations'
import { parseMessage } from './messaging/parseMessage'

const CONNECT_TIMEOUT_MS = 10_000

export function WebSocketGate(): JSX.Element | null {
  const dispatch = useAppDispatch()

  const socketRef = useRef<WebSocketWithCleanup | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)

  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didConnectTimeoutRef = useRef(false)

  const hadSocketBeforeRef = useRef(false)
  const justReconnectedRef = useRef(false)

  const isAuthenticated = useAppSelector(state =>
    Boolean(state.user.userData && state.user.tokens)
  )
  const isAuthenticatedRef = useRef(isAuthenticated)

  const [isSocketOpen, setIsSocketOpen] = useState(false)
  const [shouldConnect, setShouldConnect] = useState(false)

  const onMessage = useCallback(
    (message: unknown) => parseMessage(message, dispatch),
    [dispatch]
  )

  const { scheduleReconnect, clearReconnectTimeout } = useWebSocketReconnect(
    reconnectTimeoutRef,
    isAuthenticatedRef,
    reconnectAttemptsRef,
    setShouldConnect
  )

  const onClose = useCallback(
    (event: CloseEvent) => {
      // Socket already cleaned up by internal handler before this callback fires
      socketRef.current = null
      setIsSocketOpen(false)

      // Only attempt reconnection if it wasn't a normal closure (1000).
      if (event.code !== 1000) {
        console.warn(
          `WebSocket closed unexpectedly (code: ${event.code}, reason: ${event.reason || 'none'}). ` +
            `Attempting to reconnect...`
        )
        scheduleReconnect()
      } else {
        reconnectAttemptsRef.current = 0
        clearReconnectTimeout()
      }
    },
    [scheduleReconnect, clearReconnectTimeout]
  )

  const onError = useCallback((error: Event) => {
    console.error('WebSocket error:', error)
  }, [])

  const callBacks = useMemo(
    () => ({ onMessage, onClose, onError }),
    [onMessage, onClose, onError]
  )

  const clearConnectTimeout = useCallback((): void => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current)
      connectTimeoutRef.current = null
    }
  }, [])

  const teardown = useCallback((): void => {
    clearConnectTimeout()
    closeWebSocketConnection(socketRef, setIsSocketOpen)
    clearReconnectTimeout()
  }, [clearConnectTimeout, clearReconnectTimeout])

  const triggerReconnect = useCallback((): void => {
    reconnectAttemptsRef.current = 0
    clearReconnectTimeout()
    setShouldConnect(prev => !prev)
  }, [clearReconnectTimeout])

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated
  }, [isAuthenticated])

  // Reset reconnection state on successful connection and mark for calendar re-sync
  useEffect(() => {
    if (!isSocketOpen) return

    clearConnectTimeout()

    // Reset timeout marker on successful connection
    didConnectTimeoutRef.current = false

    if (hadSocketBeforeRef.current) {
      justReconnectedRef.current = true
    }

    hadSocketBeforeRef.current = true
    reconnectAttemptsRef.current = 0

    clearReconnectTimeout()
  }, [isSocketOpen, clearConnectTimeout, clearReconnectTimeout])

  // Manage WebSocket connection
  useEffect(() => {
    const abortController = new AbortController()
    const websocketUrl = window.WEBSOCKET_URL

    if (!isAuthenticated || !websocketUrl) {
      teardown()
      reconnectAttemptsRef.current = 0
      hadSocketBeforeRef.current = false
      return
    }

    const connect = async (): Promise<void> => {
      if (isConnectingRef.current || isSocketOpen) return
      isConnectingRef.current = true
      setWebSocketConnecting(true)
      didConnectTimeoutRef.current = false

      connectTimeoutRef.current = setTimeout(() => {
        console.warn('WebSocket connection attempt timed out')

        didConnectTimeoutRef.current = true
        abortController.abort()
        connectTimeoutRef.current = null
        isConnectingRef.current = false
        setWebSocketConnecting(false)
        teardown()

        scheduleReconnect()
      }, CONNECT_TIMEOUT_MS)

      try {
        await establishWebSocketConnection(
          websocketUrl,
          api,
          callBacks,
          socketRef,
          setIsSocketOpen,
          abortController.signal
        )
      } catch (err) {
        console.warn('WebSocket establishment failed:', err)

        clearConnectTimeout()

        // Only schedule reconnect if the timeout handler hasn't already done so
        if (!didConnectTimeoutRef.current) {
          scheduleReconnect()
        }
      } finally {
        isConnectingRef.current = false
        setWebSocketConnecting(false)
      }
    }

    void connect()

    return (): void => {
      abortController.abort()
      teardown()
    }
    // isSocketOpen is intentionally omitted: adding it would tear down the
    // socket as soon as it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    callBacks,
    teardown,
    clearConnectTimeout,
    shouldConnect,
    scheduleReconnect
  ])

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = (): void => {
      if (!isSocketOpen && isAuthenticatedRef.current) triggerReconnect()
    }
    const handleOffline = teardown

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return (): void => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isSocketOpen, triggerReconnect, teardown])

  // Ping monitoring while the socket is open
  useEffect(() => {
    const socket = socketRef.current
    if (!isSocketOpen || !socket) return

    const ping = setupWebSocketPing(socket, {
      onConnectionDead: () => {
        console.warn('WebSocket connection appears dead (no pong received)')
        // Closing triggers onClose, which schedules the reconnection
        socket.close()
      },
      onPingFail: () => console.warn('Failed to send ping')
    })

    return (): void => ping.stop()
  }, [isSocketOpen])

  // Keep server-side address book subscriptions in sync with the store
  useSyncRegistrations({ socketRef, isSocketOpen })

  useEffect(() => {
    registerWebSocketState(socketRef, triggerReconnect)
  }, [triggerReconnect])

  return null
}
