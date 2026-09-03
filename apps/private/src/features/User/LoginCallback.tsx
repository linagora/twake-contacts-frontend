import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setAppLoading } from '@common/app/loadingSlice'
import { Callback } from '@common/features/User/oidcAuth'
import {
  getOpenPaasUserData,
  setTokens,
  setUserData,
  setUserError
} from '@common/features/User/UserSlice'
import {
  TokenEndpointResponse,
  TokenEndpointResponseHelpers,
  UserInfoResponse
} from 'openid-client'
import { useEffect, useRef } from 'react'
import { replace } from 'redux-first-history'

interface RedirectState {
  code_verifier: string
  state: string
}

const getSavedRedirectState = (): RedirectState | null => {
  const item = sessionStorage.getItem('redirectState')
  if (!item) return null
  try {
    const parsed = JSON.parse(item) as RedirectState

    if (parsed.code_verifier && parsed.state) {
      return parsed
    }
  } catch {
    console.error('Invalid redirectState')
  }
  return null
}

const hasSavedToken = (): boolean => {
  return sessionStorage.getItem('tokenSet') !== null
}

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : 'OAuth callback failed'
}

const processCallbackData = async (
  codeVerifier: string,
  state: string
): Promise<{
  userinfo: UserInfoResponse
  tokenSet: TokenEndpointResponse & TokenEndpointResponseHelpers
}> => {
  const data = await Callback(codeVerifier, state)
  if (!data?.userinfo || !data?.tokenSet) {
    throw new Error('OAuth callback failed')
  }
  return data
}

export const CallbackResume: React.FC = () => {
  const dispatch = useAppDispatch()
  const hasRun = useRef(false)
  const hasNavigated = useRef(false)
  const userData = useAppSelector(state => state.user)

  // Process callback and load data
  useEffect(() => {
    if (hasRun.current) {
      return
    }
    hasRun.current = true

    const runCallback = async (): Promise<void> => {
      const saved = getSavedRedirectState()
      const savedToken = hasSavedToken()

      // If no redirectState but we have saved session, just go home
      // This can happen if user refreshes callback page or gets redirected here after already logged in
      if (!saved) {
        if (!savedToken) {
          console.warn('Missing redirectState')
        }
        sessionStorage.removeItem('redirectState')
        dispatch(replace('/'))
        return
      }

      try {
        dispatch(setAppLoading(true))

        const data = await processCallbackData(saved.code_verifier, saved.state)

        // IMPORTANT: Save tokens to sessionStorage FIRST before making any API calls
        // because API calls will read token from sessionStorage
        sessionStorage.setItem('tokenSet', JSON.stringify(data.tokenSet))
        sessionStorage.setItem('userData', JSON.stringify(data.userinfo))

        dispatch(setUserData(data.userinfo))
        dispatch(setTokens(data.tokenSet))

        await dispatch(getOpenPaasUserData())

        sessionStorage.removeItem('redirectState')
      } catch (e) {
        console.error('OIDC callback error:', e)
        dispatch(setAppLoading(false))
        dispatch(setUserError(getErrorMessage(e)))
        dispatch(replace('/error'))
      }
    }

    void runCallback()
  }, [dispatch])

  // Navigate to /contacts only when user data is ready
  useEffect(() => {
    if (hasNavigated.current) return
    if (userData.loading) return
    if (userData.error) {
      dispatch(setAppLoading(false))
      dispatch(replace('/error'))
      return
    }
    if (!userData.userData || !userData.tokens) return

    hasNavigated.current = true
    dispatch(setAppLoading(false))

    // Clear any query params from URL first, then navigate
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    dispatch(replace('/contacts'))
  }, [
    userData.loading,
    userData.userData,
    userData.tokens,
    userData.error,
    dispatch
  ])

  return null
}
