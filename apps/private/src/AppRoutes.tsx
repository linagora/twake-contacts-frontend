import { useAppSelector } from '@common/app/hooks'
import { Error as ErrorPage } from '@common/components/Error/Error'
import { ErrorSnackbar } from '@common/components/Error/ErrorSnackbar'
import { MobileWarning } from '@common/components/MobileWarning/MobileWarning'
import { useBreakpoints } from '@linagora/twake-mui'
import { useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router'
import { AddressBookPage } from './features/Contacts/AddressBookPage'
import { ContactPage } from './features/Contacts/ContactPage'
import { ContactsPage } from './features/Contacts/ContactsPage'
import { CreateContactPage } from './features/Contacts/CreateContactPage'
import { EditContactPage } from './features/Contacts/EditContactPage'
import HandleLogin from './features/User/HandleLogin'
import { CallbackResume } from './features/User/LoginCallback'

export function AppRoutes(): JSX.Element {
  const error = useAppSelector(state => state.user.error)
  const navigate = useNavigate()
  const { isMobile } = useBreakpoints()

  useEffect(() => {
    if (error) {
      void navigate('/error')
    }
  }, [error, navigate])

  if (isMobile) {
    return <MobileWarning />
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<HandleLogin />} />
        <Route path="/contacts" element={<ContactsPage />}>
          <Route index element={<AddressBookPage />} />
          <Route path="new" element={<CreateContactPage />} />
          <Route path=":addressBookId/new" element={<CreateContactPage />} />
          <Route path=":addressBookId" element={<AddressBookPage />} />
          <Route path=":addressBookId/:contactId" element={<ContactPage />} />
          <Route
            path=":addressBookId/:contactId/edit"
            element={<EditContactPage />}
          />
        </Route>
        <Route path="/callback" element={<CallbackResume />} />
        <Route path="/error" element={<ErrorPage />} />
      </Routes>
      <ErrorSnackbar error={error} />
    </>
  )
}
