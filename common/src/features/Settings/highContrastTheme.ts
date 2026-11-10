import type { ThemeOptions } from '@mui/material/styles'

/**
 * Light high-contrast scheme (RGAA 3.2, 3.3, 10.7, 10.12).
 *
 * Handed to `TwakeMuiThemeProvider` through its `themeOptions` prop only when
 * the user switched high contrast on, so the default light and dark themes are
 * left untouched. To be replaced by the twake-mui `highContrast` scheme once
 * linagora/twake-ui#211 ships.
 *
 * Component rules live in the CssBaseline global styles: twake-mui defines its
 * component overrides as functions, which a theme deep-merge would replace.
 */
export const HIGH_CONTRAST_COLORS = {
  textPrimary: '#1B1B1D',
  textSecondary: '#3D3D40',
  primary: '#0047B3',
  border: '#6B6B70',
  error: '#B00020',
  success: '#1B6E2A',
  white: '#FFFFFF'
} as const

const c = HIGH_CONTRAST_COLORS

const focusOutline = {
  outline: `3px solid ${c.primary}`,
  outlineOffset: 2
}

const FOCUSABLE_SELECTORS = [
  '.MuiButtonBase-root.Mui-focusVisible',
  '.MuiInputBase-root.Mui-focused',
  '.MuiTab-root.Mui-focusVisible',
  '.MuiMenuItem-root.Mui-focusVisible',
  '.MuiTableSortLabel-root.Mui-focusVisible',
  '.MuiTableSortLabel-root:focus-visible',
  'a:focus-visible'
].join(', ')

const SEARCH_BAR_SELECTOR = '.MuiPaper-root:has(> .SearchBar-icon)'

const INITIALS_AVATAR_SELECTOR = '.MuiAvatar-root:not(:has(> img))'

export const highContrastThemeOptions: ThemeOptions = {
  colorSchemes: {
    light: {
      palette: {
        text: {
          primary: c.textPrimary,
          secondary: c.textSecondary,
          icon: c.textSecondary
        },
        primary: { main: c.primary, contrastText: c.white },
        error: { main: c.error, contrastText: c.white },
        success: { main: c.success, contrastText: c.white },
        border: { main: c.border },
        divider: c.border
      }
    }
  },
  typography: {
    body1: { fontSize: '1rem' },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem' }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        [FOCUSABLE_SELECTORS]: focusOutline,
        '.MuiTouchRipple-root': { display: 'none' },
        '.MuiOutlinedInput-notchedOutline': { borderColor: c.border },
        '.MuiInputBase-input::placeholder': {
          color: c.textSecondary,
          opacity: 1
        },
        '.MuiTableCell-root': {
          borderBottomColor: c.border,
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
          textOverflow: 'clip'
        },
        '.MuiTableCell-root *': {
          whiteSpace: 'normal',
          textOverflow: 'clip'
        },
        '.MuiButton-outlined': { borderColor: c.border },
        [SEARCH_BAR_SELECTOR]: { borderColor: c.border },
        [INITIALS_AVATAR_SELECTOR]: {
          background: c.white,
          color: c.textPrimary,
          border: `1px solid ${c.textPrimary}`
        },
        '@media (forced-colors: active)': {
          [FOCUSABLE_SELECTORS]: { outlineColor: 'Highlight' },
          '.MuiIconButton-root': { border: '1px solid ButtonText' }
        }
      }
    }
  }
}
