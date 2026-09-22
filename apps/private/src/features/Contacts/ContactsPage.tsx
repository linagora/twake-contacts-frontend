import {
  Alert,
  CircularProgress,
  Content,
  Layout,
  Main
} from '@linagora/twake-mui'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import { fetchContacts } from '@common/features/Contacts/ContactsSlice'
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { ContactsSidebar } from './ContactsSidebar'

export const ContactsPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const domains = useAppSelector(state => state.user.userData.domains)
  const loading = useAppSelector(state => state.contacts.loading)
  const error = useAppSelector(state => state.contacts.error)
  useEffect(() => {
    if (openpaasId) {
      void dispatch(fetchContacts({ userId: openpaasId, domains }))
    }
  }, [openpaasId, domains, dispatch])

  return (
    <Layout withTopBar={false}>
      <ContactsSidebar />
      <Main>
        <Content className="u-p-1">
          {loading && <CircularProgress />}
          {error && <Alert severity="error">{error}</Alert>}
          {!loading && <Outlet />}
        </Content>
      </Main>
    </Layout>
  )
}
