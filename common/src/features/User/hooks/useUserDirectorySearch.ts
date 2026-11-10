import { searchUsers } from '../UserDao'
import { OpenPaasUserData } from '../type/OpenPaasUserData'

/** Searches the users of the platform, leaving out the `excludes` ids. */
export type UserDirectorySearch = (
  q: string,
  excludes?: string[]
) => Promise<OpenPaasUserData[]>

/** Search of the users of the platform, resolving to no user on failure. */
export function useUserDirectorySearch(): UserDirectorySearch {
  return searchUsers
}
