import { AVAILABLE_LANGUAGES } from '@common/features/Settings/constants'
import {
  de as deLocale,
  enGB,
  es as esLocale,
  fr as frLocale,
  it as itLocale,
  ru as ruLocale,
  vi as viLocale
} from 'date-fns/locale'

import de from '@common/locales/de.json'
import en from '@common/locales/en.json'
import es from '@common/locales/es.json'
import fr from '@common/locales/fr.json'
import it from '@common/locales/it.json'
import ru from '@common/locales/ru.json'
import vi from '@common/locales/vi.json'

export const locale = { en, fr, ru, vi, es, de, it }

export const dateLocales = {
  en: enGB,
  fr: frLocale,
  ru: ruLocale,
  vi: viLocale,
  es: esLocale,
  de: deLocale,
  it: itLocale
}

const SUPPORTED_LANGUAGES = AVAILABLE_LANGUAGES.map(lang => lang.code)
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const isValidLanguage = (
  lang: string | null | undefined
): lang is SupportedLanguage => {
  return !!lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
}
