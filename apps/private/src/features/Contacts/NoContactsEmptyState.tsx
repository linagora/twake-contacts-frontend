import { Box, Typography } from '@linagora/twake-mui'
import { useI18n } from 'twake-i18n'

export const NoContactsEmptyState: React.FC = () => {
  const { t } = useI18n()

  return (
    <Box>
      <img
        src="/assets/images/svg/no-contact.svg"
        alt=""
        width={80}
        height={80}
      />
      <Typography variant="h5">{t('contacts.empty.title')}</Typography>
      <Typography variant="body1">{t('contacts.empty.subtitle')}</Typography>
    </Box>
  )
}
