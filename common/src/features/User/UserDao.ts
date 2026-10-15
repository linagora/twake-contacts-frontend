import { api } from '@common/utils/apiUtils'
import {
  OpenPaasUserData,
  normalizeOpenPaasUser
} from './type/OpenPaasUserData'
import { ModuleConfiguration } from './userDataTypes'

export async function fetchCurrentUser(): Promise<OpenPaasUserData> {
  const response = await api.get(`api/user`)
  const data: OpenPaasUserData = await response.json()

  return normalizeOpenPaasUser(data)
}

export async function patchConfigurations(
  modules: ModuleConfiguration[]
): Promise<Response> {
  return await api.patch(`api/configurations?scope=user`, {
    json: modules
  })
}

export async function fetchUserById(id: string): Promise<OpenPaasUserData> {
  const entity: { user?: OpenPaasUserData } = await api
    .get(`api/entity/${id}`)
    .json()
  if (!entity.user) {
    throw new Error(`User entity not found for id ${id}`)
  }
  return normalizeOpenPaasUser(entity.user)
}

export async function searchUsers(
  q: string,
  excludes: string[] = []
): Promise<OpenPaasUserData[]> {
  if (!q.trim()) return []

  const payload = {
    q,
    objectTypes: ['user'],
    limit: 5,
    excludes: excludes.map(id => ({ id, objectType: 'user' }))
  }

  try {
    const response: OpenPaasUserData[] = await api
      .post(`api/people/search`, { json: payload })
      .json()

    return response.map(normalizeOpenPaasUser)
  } catch (error) {
    console.error('Failed to search users:', error)
    return []
  }
}
