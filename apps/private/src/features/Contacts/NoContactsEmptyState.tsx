import { useAppSelector } from '@common/app/hooks'
import { ThemeMode } from '@common/features/Settings/SettingsSlice'
import { Empty, Stack } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

const ILLUSTRATION_BY_THEME: Record<ThemeMode, string> = {
  light: '/assets/images/svg/no-contact.svg',
  dark: '/assets/images/svg/no-contact-dark.svg'
}

interface NoContactsEmptyStateProps {
  action: React.ReactNode
}

export const NoContactsEmptyState: React.FC<NoContactsEmptyStateProps> = ({
  action
}) => {
  const { t } = useI18n()
  const themeMode = useAppSelector(state => state.settings.themeMode)

  return (
    <Empty
      icon={
        <img
          src={ILLUSTRATION_BY_THEME[themeMode]}
          alt=""
          width={100}
          height={80}
        />
      }
      iconSize="normal"
      text={t('contacts.empty.subtitle')}
      title={t('contacts.empty.title')}
    >
      <Stack className="u-flex-items-center u-mt-1">{action}</Stack>
    </Empty>
  )
}
