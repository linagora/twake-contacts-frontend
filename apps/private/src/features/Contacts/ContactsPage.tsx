import { createContactPath, useContactRouteParams } from './contactPath'
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
  createAddressBook,
  subscribeAddressBook
} from '@common/features/Contacts/ContactsSlice'
import { selectBook } from '@common/features/Contacts/contactsSelectors'
import {
  AddressBook,
  RawAddressBook,
  UserResult
} from '@common/features/Contacts/contactsTypes'
import { getAddressBookDisplayName } from '@common/features/Contacts/contactsUtils'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useI18n } from 'twake-i18n'
import { AddressBookSuccessSnackbar } from './AddressBookSuccessSnackbar'
import { ContactTransferSnackbar } from './ContactTransferSnackbar'
import { ContactsSidebar } from './ContactsSidebar'
import { ContactSearchBar } from './ContactSearchBar'
import { CreateAddressBookDialog } from './CreateAddressBookDialog'
import { SubscribeAddressBookDialog } from './SubscribeAddressBookDialog'
import { MobileTopBar } from './MobileTopBar'
import { ThemePicker } from '@common/components/ThemePicker/ThemePicker'
import { SkipLink } from './SkipLink'

const MAIN_CONTENT_ID = 'main-content'
const SPECIAL_CONTACT_SUBROUTES = new Set(['new', 'merge'])

const isContactsRootSegment = (segments: string[]): boolean =>
  segments.length === 1 && segments[0] === 'contacts'

const isContactsChildSegment = (segments: string[]): boolean =>
  segments.length === 2 && segments[0] === 'contacts'

function getContactsRouteState(pathname: string): {
  isMergePage: boolean
  isAddressBookPage: boolean
} {
  const segments = pathname.split('/').filter(Boolean)
  const isChild = isContactsChildSegment(segments)
  const isMergePage = isChild && segments[1] === 'merge'
  const isAddressBookPage =
    isContactsRootSegment(segments) ||
    (isChild && !SPECIAL_CONTACT_SUBROUTES.has(segments[1]))
  return { isMergePage, isAddressBookPage }
}

function getContactsPageTitle(
  isMergePage: boolean,
  addressBookId: string | undefined,
  book: AddressBook | undefined,
  t: (key: string) => string
): string {
  if (isMergePage) return t('contacts.merge.title')
  if (addressBookId) return getAddressBookDisplayName(book, t)
  return t('contacts.myContacts')
}

function getCreateContactLink(
  addressBookId: string | undefined,
  currentBook: AddressBook | undefined
): string {
  const canWrite = currentBook?.capabilities.addContacts ?? false
  return addressBookId && canWrite
    ? createContactPath(addressBookId)
    : '/contacts/new'
}

function useCreateAddressBookModal(openpaasId: string | undefined): {
  isOpen: boolean
  isCreating: boolean
  showSuccess: boolean
  open: () => void
  close: () => void
  dismissSuccess: () => void
  confirm: (name: string) => void
} {
  const dispatch = useAppDispatch()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const confirm = (name: string): void => {
    if (isCreating) return
    if (!openpaasId) {
      setIsOpen(false)
      return
    }
    setIsCreating(true)
    const run = async (): Promise<void> => {
      try {
        await dispatch(createAddressBook({ userId: openpaasId, name })).unwrap()
        setShowSuccess(true)
      } catch {
        // error is surfaced by the contacts slice
      } finally {
        setIsCreating(false)
        setIsOpen(false)
      }
    }
    void run()
  }

  return {
    isOpen,
    isCreating,
    showSuccess,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    dismissSuccess: () => setShowSuccess(false),
    confirm
  }
}

function useSubscribeAddressBookModal(openpaasId: string | undefined): {
  isOpen: boolean
  isSubscribing: boolean
  showSuccess: boolean
  open: () => void
  close: () => void
  dismissSuccess: () => void
  confirm: (user: UserResult, books: RawAddressBook[]) => void
} {
  const dispatch = useAppDispatch()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const close = (): void => {
    dispatch(clearContactsError())
    setIsOpen(false)
  }

  const confirm = (user: UserResult, books: RawAddressBook[]): void => {
    if (isSubscribing || !openpaasId) return
    dispatch(clearContactsError())
    setIsSubscribing(true)
    const run = async (): Promise<void> => {
      try {
        const results = await Promise.allSettled(
          books.map(source =>
            dispatch(
              subscribeAddressBook({
                userId: openpaasId,
                source,
                ownerDisplayName: user.displayName
              })
            ).unwrap()
          )
        )
        const succeeded = results.filter(r => r.status === 'fulfilled')
        if (succeeded.length > 0) setShowSuccess(true)
        // keep the dialog open on failure: only the books still to add remain listed
        if (succeeded.length === results.length) setIsOpen(false)
      } finally {
        setIsSubscribing(false)
      }
    }
    void run()
  }

  return {
    isOpen,
    isSubscribing,
    showSuccess,
    open: () => setIsOpen(true),
    close,
    dismissSuccess: () => setShowSuccess(false),
    confirm
  }
}

const ContactsSearchHeader: React.FC<{
  isAddressBookPage: boolean
  isMobileSearchOpen: boolean
}> = ({ isAddressBookPage, isMobileSearchOpen }) => {
  const { isDesktop, isExtraLarge } = useBreakpoints()
  const isLargeScreen = isDesktop || isExtraLarge
  const isVisible = isLargeScreen || isAddressBookPage || isMobileSearchOpen
  if (!isVisible) return null

  return (
    <Stack
      role="search"
      direction="row"
      className="u-flex-items-center u-flex-justify-between u-mb-1"
    >
      <ContactSearchBar />
      <Stack direction="row" className="u-flex-items-center">
        {isLargeScreen && <ThemePicker />}
      </Stack>
    </Stack>
  )
}

const MobileCreateContactFab: React.FC<{
  isAddressBookPage: boolean
  createLink: string
}> = ({ isAddressBookPage, createLink }) => {
  const { t } = useI18n()
  const { isMobile, isTablet } = useBreakpoints()
  const isCompactScreen = isMobile || isTablet
  if (!isCompactScreen || !isAddressBookPage) return null

  return (
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
  )
}

const ActionSuccessSnackbar: React.FC<{
  open: boolean
  message: string
  filled?: boolean
  onClose: () => void
}> = ({ open, message, filled = false, onClose }) => {
  const { t } = useI18n()
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        variant={filled ? 'filled' : undefined}
        severity="success"
        closeText={t('contacts.form.close')}
        onClose={onClose}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}

export const ContactsPage: React.FC = () => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { addressBookId } = useContactRouteParams()
  const { pathname } = useLocation()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const domains = useAppSelector(state => state.user.userData.domains)
  const error = useAppSelector(state => state.contacts.error)
  const addressBooks = useAppSelector(state => state.contacts.addressBooks)
  const currentBook = addressBookId ? addressBooks[addressBookId] : undefined
  const book = useAppSelector(state => selectBook(state, addressBookId))

  const createBookModal = useCreateAddressBookModal(openpaasId)
  const subscribeModal = useSubscribeAddressBookModal(openpaasId)

  const { isMergePage, isAddressBookPage } = getContactsRouteState(pathname)
  const title = getContactsPageTitle(isMergePage, addressBookId, book, t)
  const createLink = getCreateContactLink(addressBookId, currentBook)

  useEffect(() => {
    // an error belongs to the page where the action failed
    dispatch(clearContactsError())
    setIsMobileSearchOpen(false)
    setIsSidebarOpen(false)
  }, [pathname, dispatch])

  useEffect(() => {
    if (openpaasId) {
      void dispatch(fetchContacts({ userId: openpaasId, domains }))
    }
  }, [openpaasId, domains, dispatch])

  return (
    <Layout withTopBar={false} className="u-h-100">
      <SkipLink targetId={MAIN_CONTENT_ID} />
      <ContactsSidebar
        onOpenSubscribe={subscribeModal.open}
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenCreateBook={() => {
          setIsSidebarOpen(false)
          createBookModal.open()
        }}
      />
      <Main id={MAIN_CONTENT_ID} tabIndex={-1}>
        {/* Content forces role="main": the <main> of Main is the only landmark */}
        <Content className="u-p-1" role={undefined}>
          <MobileTopBar
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onToggleSearch={() => setIsMobileSearchOpen(prev => !prev)}
            isAddressBookPage={isAddressBookPage}
            title={title}
            addressBookId={addressBookId}
          />
          <ContactsSearchHeader
            isAddressBookPage={isAddressBookPage}
            isMobileSearchOpen={isMobileSearchOpen}
          />
          {error && (
            <Alert
              severity="error"
              closeText={t('contacts.form.close')}
              onClose={() => dispatch(clearContactsError())}
            >
              {t(error)}
            </Alert>
          )}
          <Outlet />
          <MobileCreateContactFab
            isAddressBookPage={isAddressBookPage}
            createLink={createLink}
          />
        </Content>
      </Main>
      {createBookModal.isOpen && (
        <CreateAddressBookDialog
          isCreating={createBookModal.isCreating}
          onClose={createBookModal.close}
          onConfirm={createBookModal.confirm}
        />
      )}
      {subscribeModal.isOpen && (
        <SubscribeAddressBookDialog
          isSubscribing={subscribeModal.isSubscribing}
          error={error}
          onClose={subscribeModal.close}
          onConfirm={subscribeModal.confirm}
        />
      )}
      <ActionSuccessSnackbar
        open={createBookModal.showSuccess}
        message={t('contacts.addressBook.createSuccess')}
        filled
        onClose={createBookModal.dismissSuccess}
      />
      <ActionSuccessSnackbar
        open={subscribeModal.showSuccess}
        message={t('contacts.addressBook.subscribeSuccess')}
        onClose={subscribeModal.dismissSuccess}
      />
      <ContactTransferSnackbar />
      <AddressBookSuccessSnackbar />
    </Layout>
  )
}
