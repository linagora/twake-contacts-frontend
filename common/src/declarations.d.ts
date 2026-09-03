declare module '*.styl'

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
  const I18n: import('react').ComponentType<unknown>
  export default I18n
}
