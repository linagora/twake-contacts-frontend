import { useAppSelector } from '@common/app/hooks'
import { WebSocketWithCleanup } from '@linagora/twake-websocket'
import { useRef, useEffect } from 'react'
import { shallowEqual } from 'react-redux'

export function useSyncRegistrations({
  socketRef,
  isSocketOpen
}: {
  socketRef: React.MutableRefObject<WebSocketWithCleanup | null>
  isSocketOpen: boolean
}): void {
  // Paths currently registered on the live socket
  const registeredAddressBooksRef = useRef<Set<string>>(new Set())
  const addressBookPaths = useAppSelector(
    state =>
      Object.values(state.contacts.addressBooks)
        .filter(ab => ab.userId && ab.id)
        .map(ab => `/addressbooks/${ab.userId}/${ab.id}`),
    shallowEqual
  )
  useEffect(() => {
    const registered = registeredAddressBooksRef.current
    const socket = socketRef.current

    if (!isSocketOpen || socket?.readyState !== WebSocket.OPEN) {
      // Subscriptions die with the socket: re-register everything on reconnect
      registered.clear()
      return
    }

    const wanted = new Set(addressBookPaths)
    const toRegister = [...wanted].filter(path => !registered.has(path))
    const toUnregister = [...registered].filter(path => !wanted.has(path))

    if (toUnregister.length > 0) {
      socket.send(JSON.stringify({ unregister: toUnregister }))
      toUnregister.forEach(path => registered.delete(path))
    }

    if (toRegister.length > 0) {
      socket.send(JSON.stringify({ register: toRegister }))
      toRegister.forEach(path => registered.add(path))
    }
  }, [isSocketOpen, addressBookPaths, socketRef])
}
