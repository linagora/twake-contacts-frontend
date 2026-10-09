import {
  ModuleConfiguration,
  userData
} from '@common/features/User/userDataTypes'

export interface Domain {
  domain_id: string
  joined_at: string
}

export interface OpenPaasUserData {
  firstname?: string
  lastname?: string
  id: string
  _id?: string
  preferredEmail?: string
  configurations?: {
    modules?: ModuleConfiguration[]
  }
  emails: string[]
  emailAddresses?: { value: string }[]
  names?: { displayName: string }[]
  resource?: boolean
  administrators?: {
    _id: string
    id: string
    objectType: string
    access?: number
  }[]
  resourceIcon?: string
  domains?: Domain[]
}

export function normalizeOpenPaasUser(
  user: OpenPaasUserData
): OpenPaasUserData {
  if (!user.id && user._id) {
    user.id = user._id
  }
  return user
}

const extractEmail = (openpaas: OpenPaasUserData): string => {
  const rawEmailAddresses = openpaas.emailAddresses || []
  return (
    openpaas.preferredEmail ??
    openpaas.emails?.[0] ??
    rawEmailAddresses[0]?.value ??
    ''
  )
}

const extractName = (
  openpaas: OpenPaasUserData,
  givenName: string,
  familyName: string
): string => {
  return (
    openpaas.names?.[0]?.displayName ||
    [givenName, familyName].filter(Boolean).join(' ') ||
    ''
  )
}

export function ToUserData(
  openpaas: OpenPaasUserData | undefined
): userData | undefined {
  if (!openpaas) return undefined

  const email = extractEmail(openpaas)
  const given_name = openpaas.firstname ?? ''
  const family_name = openpaas.lastname ?? ''

  return {
    email,
    given_name,
    family_name,
    name: extractName(openpaas, given_name, family_name),
    sid: openpaas.id ?? '',
    sub: openpaas.id ?? '',
    openpaasId: openpaas.id,
    domains: openpaas.domains?.map(d => ({
      domainId: d.domain_id,
      joinedAt: d.joined_at
    }))
  }
}
