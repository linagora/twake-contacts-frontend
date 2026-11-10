declare module '*.styl'
declare module '@linagora/twake-css/dist/utils.css'

declare const process: {
  env: {
    [key: string]: string | undefined
  }
}

declare module 'twake-i18n' {
  export function useI18n(): {
    t: (key: string, options?: Record<string, unknown>) => string
    f: (date: string, format: string) => string
    lang: string
  }
  export const I18nContext: import('react').Context<unknown>
  export const DEFAULT_LANG: string
  export interface I18nProps {
    lang: string
    // Method syntax keeps the parameter bivariant, so a dictionary loader typed on the
    // supported locale keys is accepted
    dictRequire(lang: string): unknown
    locales?: Record<string, unknown>
    defaultLang?: string
    children?: import('react').ReactNode
  }
  const I18n: import('react').ComponentType<I18nProps>
  export default I18n
}
