import { useAppSelector } from '@common/app/hooks'
import { Error as ErrorPage } from '@common/components/Error/Error'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { useEffect } from 'react'
import { useNavigate, Routes, Route } from 'react-router-dom'
import { AddressBookPage } from './features/Contacts/AddressBookPage'
import { ContactPage } from './features/Contacts/ContactPage'
import { ContactsPage } from './features/Contacts/ContactsPage'
import HandleLogin from './features/User/HandleLogin'
import { CallbackResume } from './features/User/LoginCallback'

export function AppRoutes(): JSX.Element {
  const error = useAppSelector(state => state.user.error)
  const navigate = useNavigate()

  useEffect(() => {
    if (error) {
      navigate('/error')
    }
  }, [error, navigate])

  return (
    <>
      <Routes>
        <Route path="/" element={<HandleLogin />} />
        <Route path="/contacts" element={<ContactsPage />}>
          <Route index element={<AddressBookPage />} />
          <Route path=":addressBookId" element={<AddressBookPage />} />
          <Route path=":addressBookId/:contactId" element={<ContactPage />} />
        </Route>
        <Route path="/callback" element={<CallbackResume />} />
        <Route path="/error" element={<ErrorPage />} />
      </Routes>
      <ErrorSnackbar error={error} />
    </>
  )
}
