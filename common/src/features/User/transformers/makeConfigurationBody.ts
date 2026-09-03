import { ConfigurationItem, ModuleConfiguration } from '../userDataTypes'

export interface ConfigurationUpdatesInput {
  language?: string
  notifications?: Record<string, unknown>
  timezone?: string | null
  previousConfig?: Record<string, unknown>
}

export interface ConfigurationBody {
  modules: ModuleConfiguration[]
}

function pushIfDefined(
  configs: ConfigurationItem[],
  name: string,
  value: unknown
): void {
  if (value !== undefined) {
    configs.push({ name, value })
  }
}

function buildCoreConfigs(
  updates: ConfigurationUpdatesInput
): ConfigurationItem[] {
  const configs: ConfigurationItem[] = []
  pushIfDefined(configs, 'language', updates.language)
  pushIfDefined(configs, 'notifications', updates.notifications)

  if (updates.timezone !== undefined) {
    const previousDatetime = updates.previousConfig?.datetime as
      { timeZone?: string } | undefined
    configs.push({
      name: 'datetime',
      value: { ...previousDatetime, timeZone: updates.timezone }
    })
  }

  return configs
}

function buildModule(
  name: string,
  configurations: ConfigurationItem[]
): ModuleConfiguration | null {
  return configurations.length > 0 ? { name, configurations } : null
}

export function makeConfigurationBody(
  updates: ConfigurationUpdatesInput
): ConfigurationBody {
  const modules: ModuleConfiguration[] = []

  const core = buildModule('core', buildCoreConfigs(updates))
  if (core) modules.push(core)

  return { modules }
}
