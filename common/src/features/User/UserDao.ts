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
  const entity = await api.get(`api/entity/${id}`).json()
  if (!entity.user) {
    throw new Error(`User entity not found for id ${id}`)
  }
  return normalizeOpenPaasUser(entity.user)
}
