export interface userData {
  email: string
  family_name: string
  given_name: string
  name: string
  sid: string
  sub: string
  openpaasId?: string
  language?: string
  timezone?: string | null
  workplaceFqdn?: string
}

export interface UserConfigurations {
  modules?: ModuleConfiguration[]
}

export interface NotificationSettings {
  email?: boolean
  push?: boolean
}

export type NotificationSettingsExtended = NotificationSettings & {
  [key: string]: unknown
}

// Type for configuration item
export interface ConfigurationItem {
  name: string
  value: unknown
}

// Type for module configuration
export interface ModuleConfiguration {
  name: string
  configurations: ConfigurationItem[]
}
