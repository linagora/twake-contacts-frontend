import { Stack, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'
import { ImportContactsButton } from './ImportContactsButton'

interface NoContactsEmptyStateProps {
  addressBookId?: string
}

export const NoContactsEmptyState: React.FC<NoContactsEmptyStateProps> = ({
  addressBookId
}) => {
  const { t } = useI18n()

  return (
    <Stack
      spacing={2}
      sx={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}
    >
      <img
        src="/assets/images/svg/no-contact.svg"
        alt=""
        width={80}
        height={80}
      />
      <Typography variant="h5">{t('contacts.empty.title')}</Typography>
      <Typography variant="body1">{t('contacts.empty.subtitle')}</Typography>
      <ImportContactsButton addressBookId={addressBookId} />
    </Stack>
  )
}
