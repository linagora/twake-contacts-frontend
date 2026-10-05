import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { setAppLoading } from '@common/app/loadingSlice'
import { getOpenPaasUserData } from '@common/features/User/UserSlice'
import { getAccessToken, startLogin } from '@linagora/twake-oidc'
import { useEffect, useRef } from 'react'

export const useInitializeApp = (): void => {
  const userData = useAppSelector(state => state.user)
  const dispatch = useAppDispatch()
  const hasInitiatedRef = useRef(false)

  useEffect(() => {
    if (hasInitiatedRef.current) return
    const isUserDataNotEmpty =
      userData.userData && Object.keys(userData.userData).length > 0
    if (isUserDataNotEmpty) return
    if (window.location.pathname === '/callback') return
    hasInitiatedRef.current = true

    const initiateLogin = async (): Promise<void> => {
      // Former versions kept the tokens and the user info in sessionStorage
      sessionStorage.removeItem('tokenSet')
      sessionStorage.removeItem('userData')

      // The tokens live in memory only: they are there when the application
      // navigates without reloading, and a reload signs in through the SSO.
      if (getAccessToken() && userData.userData) {
        dispatch(setAppLoading(true))
        try {
          await dispatch(getOpenPaasUserData())
        } finally {
          dispatch(setAppLoading(false))
        }

        return
      }

      await startLogin()
    }

    void initiateLogin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.userData])
}
