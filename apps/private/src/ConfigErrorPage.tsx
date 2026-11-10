import type { ConfigError } from '@common/config'
import { Stack, TwakeMuiThemeProvider, Typography } from '@linagora/twake-mui'
import I18n, { useI18n } from 'twake-i18n'
import { dateLocales, isValidLanguage, locale } from './i18n'

const REASON_KEYS: Record<ConfigError['reason'], string> = {
  missing: 'configError.missing',
  invalid: 'configError.invalid'
}

interface ConfigErrorPageProps {
  readonly errors: readonly ConfigError[]
  readonly lang: string | null | undefined
}

function ConfigErrorList({
  errors
}: Pick<ConfigErrorPageProps, 'errors'>): React.JSX.Element {
  const { t } = useI18n()
  return (
    <Stack className="u-p-2" spacing={1}>
      <Typography variant="h4" component="h1">
        {t('configError.title')}
      </Typography>
      <Typography>{t('configError.hint')}</Typography>
      {errors.map(({ name, reason }) => (
        <Typography key={name} component="code">
          {t(REASON_KEYS[reason], { name })}
        </Typography>
      ))}
    </Stack>
  )
}

/** Shown instead of the app when the runtime configuration is not valid. */
export function ConfigErrorPage({
  errors,
  lang
}: ConfigErrorPageProps): React.JSX.Element {
  return (
    <TwakeMuiThemeProvider>
      <I18n
        dictRequire={(language: keyof typeof locale) => locale[language]}
        lang={isValidLanguage(lang) ? lang : 'en'}
        locales={dateLocales}
      >
        <ConfigErrorList errors={errors} />
      </I18n>
    </TwakeMuiThemeProvider>
  )
}
