import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setAppLoading } from '@common/app/loadingSlice'
import {
  getOpenPaasUserData,
  setTokens,
  setUserData,
  setUserError
} from '@common/features/User/UserSlice'
import { completeLogin } from '@linagora/twake-oidc'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

const DEFAULT_PATH = '/contacts'

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : 'OAuth callback failed'
}

export const CallbackResume: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const hasRun = useRef(false)
  const hasNavigated = useRef(false)
  const returnToRef = useRef(DEFAULT_PATH)
  const userData = useAppSelector(state => state.user)

  // Process callback and load data
  useEffect(() => {
    if (hasRun.current) {
      return
    }
    hasRun.current = true

    const runCallback = async (): Promise<void> => {
      try {
        dispatch(setAppLoading(true))

        // Keeps the tokens for the API calls before resolving
        const data = await completeLogin()

        // No sign-in pending: the callback page was reloaded or opened directly
        if (!data) {
          dispatch(setAppLoading(false))
          navigate('/', { replace: true })
          return
        }

        returnToRef.current = data.returnTo
        dispatch(setUserData(data.userinfo))
        dispatch(setTokens(data.tokenSet))

        await dispatch(getOpenPaasUserData())
      } catch (e) {
        console.error('OIDC callback error:', e)
        dispatch(setAppLoading(false))
        dispatch(setUserError(getErrorMessage(e)))
        navigate('/error', { replace: true })
      }
    }

    void runCallback()
  }, [dispatch, navigate])

  // Navigate back to where the sign-in started only when user data is ready
  useEffect(() => {
    if (hasNavigated.current) return
    if (userData.loading) return
    if (userData.error) {
      dispatch(setAppLoading(false))
      navigate('/error', { replace: true })
      return
    }
    if (!userData.userData || !userData.tokens) return

    hasNavigated.current = true
    dispatch(setAppLoading(false))

    // Clear any query params from URL first, then navigate
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    const returnTo = returnToRef.current
    navigate(returnTo.startsWith('/contacts') ? returnTo : DEFAULT_PATH, {
      replace: true
    })
  }, [
    userData.loading,
    userData.userData,
    userData.tokens,
    userData.error,
    dispatch,
    navigate
  ])

  return null
}
