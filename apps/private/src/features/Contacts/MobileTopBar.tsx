import {
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useBreakpoints
} from '@linagora/twake-mui'
import { Burger, Icon, Magnifier } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'
import { useAppSelector } from '@common/app/hooks'
import { selectContactEntries } from '@common/features/Contacts/contactsSelectors'
import { useSearchParams } from 'react-router'
import { ImportContactsButton } from './ImportContactsButton'

export interface MobileTopBarProps {
  onOpenSidebar: () => void
  onToggleSearch: () => void
  isAddressBookPage: boolean
  title?: string
  addressBookId?: string
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  onOpenSidebar,
  onToggleSearch,
  isAddressBookPage,
  title,
  addressBookId
}) => {
  const { t } = useI18n()
  const { isMobile } = useBreakpoints()
  const [searchParams] = useSearchParams()
  const openpaasId = useAppSelector(state => state.user.userData.openpaasId)
  const scope = addressBookId
    ? undefined
    : searchParams.get('scope') === 'shared'
      ? 'shared'
      : 'mine'
  const entries = useAppSelector(state =>
    selectContactEntries(state, addressBookId, scope, openpaasId)
  )

  if (!isMobile) return

  return (
    <Stack
      direction="row"
      className="u-flex-items-center u-flex-justify-between"
    >
      <Stack direction="row" spacing={1} className="u-flex-items-center">
        <Tooltip title={t('contacts.nav.menu')}>
          <IconButton
            aria-label={t('contacts.nav.menu')}
            onClick={onOpenSidebar}
          >
            <Icon icon={Burger} />
          </IconButton>
        </Tooltip>
        {isAddressBookPage && (
          <Typography variant="h6" className="u-fw-bold u-fz-medium">
            {title}
          </Typography>
        )}
      </Stack>
      <Stack direction="row" spacing={0.5} className="u-flex-items-center">
        {isAddressBookPage && entries.length > 0 && (
          <ImportContactsButton addressBookId={addressBookId} />
        )}
        {!isAddressBookPage && (
          <Tooltip title={t('contacts.nav.search')}>
            <IconButton
              aria-label={t('contacts.nav.search')}
              onClick={onToggleSearch}
            >
              <Icon icon={Magnifier} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  )
}
