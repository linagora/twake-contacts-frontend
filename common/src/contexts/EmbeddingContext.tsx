import CozyBridge from 'cozy-external-bridge'
import React, { createContext, useContext, useMemo } from 'react'

/**
 * The same SPA is served either directly on its own domain, or embedded as a
 * Cozy app inside the workplace. Being embedded is what tells us the workplace
 * already provides its own top bar, and it is also what decides whether
 * cross-origin calls to the sibling Cozy apps are allowed.
 *
 * The detection itself is cheap but it is a runtime, process-wide fact: resolve
 * it once at the root instead of instantiating a bridge in every consumer.
 */
const detectIsInIframe = (): boolean => new CozyBridge().isInIframe()

const EmbeddingContext = createContext<boolean | null>(null)

export const EmbeddingProvider = ({
  children
}: {
  children: React.ReactNode
}): JSX.Element => {
  const isInIframe = useMemo(() => detectIsInIframe(), [])

  return (
    <EmbeddingContext.Provider value={isInIframe}>
      {children}
    </EmbeddingContext.Provider>
  )
}

/**
 * Whether the app is embedded (as a Cozy app) rather than served standalone.
 *
 * Falls back to detecting on the spot when rendered outside the provider, so
 * that isolated renders (unit tests, deep links mounted on their own) keep
 * behaving like the full app.
 */
export const useIsInIframe = (): boolean => {
  const provided = useContext(EmbeddingContext)

  return useMemo(
    () => (provided === null ? detectIsInIframe() : provided),
    [provided]
  )
}
