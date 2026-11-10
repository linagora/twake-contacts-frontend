import type { Config, LoadedConfig } from '@common/config'
import type { ReactNode } from 'react'
import type { Root } from 'react-dom/client'
import { ConfigErrorPage } from './ConfigErrorPage'

/**
 * Starts the app, or shows which settings to fix when the runtime
 * configuration is not valid: a misconfigured deployment fails at the first
 * page load instead of starting a broken app.
 */
export function bootstrap(
  root: Root,
  { config, errors }: LoadedConfig,
  startApp: (config: Config) => ReactNode
): void {
  if (errors.length > 0) {
    console.error('[Config] Invalid runtime configuration (.env.js)', errors)
    root.render(<ConfigErrorPage errors={errors} lang={config.LANG} />)
    return
  }
  root.render(startApp(config))
}
