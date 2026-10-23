import type { RootState } from '@common/app/store'
import { resolveUriTemplate } from '@linagora/twake-utils'

export const selectPlatformURL = (state: RootState): string | null => {
  const user = state.user.userData
  const workplace = resolveUriTemplate('{workplaceFqdn}', {
    localpart: user.email?.split('@')[0],
    workplaceFqdn: user.workplaceFqdn,
    workplaceFqdnFallback: window.WORKPLACE_FQDN_FALLBACK
  })
  return workplace ? `https://${workplace}` : null
}
