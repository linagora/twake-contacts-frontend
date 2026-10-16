import {
  Content,
  Layout,
  Main,
  Snackbar,
  Alert,
  Stack,
  Fab,
  useBreakpoints,
  Box
} from '@linagora/twake-mui'
import { Icon, Plus } from '@linagora/twake-icons'
import { useAppDispatch, useAppSelector } from '@common/app/hooks'
import {
  clearContactsError,
  fetchContacts,
  createAddressBook
} from '@common/features/Contacts/ContactsSlice'
import { selectBook } from '@common/features/Contacts/contactsSelectors'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router'
import { useI18n } from 'twake-i18n'
import { ContactsSidebar } from './ContactsSidebar'
import { ContactSearchBar } from './ContactSearchBar'
import { CreateAddressBookDialog } from './CreateAddressBookDialog'
import { MobileTopBar } from './MobileTopBar'
import { ThemeToggle } from '@common/components/ThemeToggle/ThemeToggle'

export const ContactsPage: React.FC = () => {
  const [isCreateBookOpen, setIsCreateBookOpen] = useState(false)
  const [createSuccess, setCreateSuccess] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { isMobile } = useBreakpoints()
  const { addressBookId } = useParams()
  const location = useLocation()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const domains = useAppSelector(state => state.user.userData.domains)
  const error = useAppSelector(state => state.contacts.error)
  const { pathname } = useLocation()
  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const currentBook = addressBookId ? addressBooks[addressBookId] : undefined
  const book = useAppSelector(state => selectBook(state, addressBookId))
  const canWriteCurrentBook =
    (currentBook?.canWrite && addressBookId !== 'dab') ?? false

  const pathSegments = location.pathname.split('/').filter(Boolean)
  const isAddressBookPage =
    (pathSegments.length === 1 && pathSegments[0] === 'contacts') ||
    (pathSegments.length === 2 &&
      pathSegments[0] === 'contacts' &&
      pathSegments[1] !== 'new')

  const title = addressBookId
    ? getAddressBookDisplayName(book, t)
    : t('contacts.myContacts')

  const createLink =
    addressBookId && canWriteCurrentBook
      ? `/contacts/${addressBookId}/new`
      : '/contacts/new'

  useEffect(() => {
    // an error belongs to the page where the action failed
    dispatch(clearContactsError())
  }, [pathname, dispatch])

  useEffect(() => {
    setIsMobileSearchOpen(false)
    setIsSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (openpaasId) {
      void dispatch(fetchContacts({ userId: openpaasId, domains }))
    }
  }, [openpaasId, domains, dispatch])

  return (
    <Layout withTopBar={false}>
      <ContactsSidebar
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenCreateBook={() => {
          setIsSidebarOpen(false)
          setIsCreateBookOpen(true)
        }}
      />
      <Main>
        <Content className="u-p-1">
          <MobileTopBar
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onToggleSearch={() => setIsMobileSearchOpen(prev => !prev)}
            isAddressBookPage={isAddressBookPage}
            title={title}
            addressBookId={addressBookId}
          />
          {(!isMobile || isAddressBookPage || isMobileSearchOpen) && (
            <Stack
              direction="row"
              className="u-flex-items-center u-flex-justify-between u-mb-1"
            >
              <ContactSearchBar />
              {window.DEBUG && <ThemeToggle />}
            </Stack>
          )}
          {error && (
            <Alert
              severity="error"
              onClose={() => dispatch(clearContactsError())}
            >
              {t(error)}
            </Alert>
          )}
          <Outlet />
          {isMobile && isAddressBookPage && (
            <Box className="u-pos-fixed u-bottom-xl u-right-m">
              <Fab
                size="medium"
                color="primary"
                component={Link}
                to={createLink}
                aria-label={t('contacts.create')}
              >
                <Icon icon={Plus} />
              </Fab>
            </Box>
          )}
        </Content>
      </Main>
      {isCreateBookOpen && (
        <CreateAddressBookDialog
          isCreating={isCreating}
          onClose={() => setIsCreateBookOpen(false)}
          onConfirm={name => {
            if (isCreating) return
            setIsCreating(true)
            const create = async (): Promise<void> => {
              if (openpaasId) {
                try {
                  await dispatch(
                    createAddressBook({ userId: openpaasId, name })
                  ).unwrap()
                  setCreateSuccess(true)
                } catch {
                  // error is surfaced by the contacts slice
                } finally {
                  setIsCreating(false)
                  setIsCreateBookOpen(false)
                }
              } else {
                setIsCreating(false)
                setIsCreateBookOpen(false)
              }
            }
            void create()
          }}
        />
      )}
      <Snackbar
        open={createSuccess}
        autoHideDuration={6000}
        onClose={() => setCreateSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          variant="filled"
          severity="success"
          onClose={() => setCreateSuccess(false)}
        >
          {t('contacts.addressBook.createSuccess')}
        </Alert>
      </Snackbar>
    </Layout>
  )
}
