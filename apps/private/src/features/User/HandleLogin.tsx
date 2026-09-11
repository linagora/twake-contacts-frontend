import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { setAppLoading } from '@common/app/loadingSlice'

export const HandleLogin: React.FC = () => {
  const userData = useAppSelector(state => state.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const hasNavigatedRef = useRef(false)

  // Navigate to /contacts only when user data is ready
  useEffect(() => {
    if (hasNavigatedRef.current) return
    if (userData.loading) return
    if (userData.error) {
      dispatch(setAppLoading(false))
      navigate('/error')
      return
    }
    if (!userData.userData || !userData.tokens) return

    hasNavigatedRef.current = true
    dispatch(setAppLoading(false))
    navigate('/contacts')
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

export default HandleLogin
