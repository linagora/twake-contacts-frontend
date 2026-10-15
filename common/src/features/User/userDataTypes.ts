import { AddressBookAccessLevel } from '../Contacts/davTypes'

export interface DomainInfo {
  domainId: string
  joinedAt: string
}

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
  domains?: DomainInfo[]
  role?: AddressBookAccessLevel
  href?: string
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
