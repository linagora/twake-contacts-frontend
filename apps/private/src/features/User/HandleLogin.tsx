import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { useEffect, useRef } from 'react'
import { push } from 'redux-first-history'
import { setAppLoading } from '@common/app/loadingSlice'

export const HandleLogin: React.FC = () => {
  const userData = useAppSelector(state => state.user)
  const dispatch = useAppDispatch()
  const hasNavigatedRef = useRef(false)

  // Navigate to /contacts only when user data is ready
  useEffect(() => {
    if (hasNavigatedRef.current) return
    if (userData.loading) return
    if (userData.error) {
      dispatch(setAppLoading(false))
      dispatch(push('/error'))
      return
    }
    if (!userData.userData || !userData.tokens) return

    hasNavigatedRef.current = true
    dispatch(setAppLoading(false))
    dispatch(push('/contacts'))
  }, [
    userData.loading,
    userData.userData,
    userData.tokens,
    userData.error,
    dispatch
  ])

  return null
}

export default HandleLogin
