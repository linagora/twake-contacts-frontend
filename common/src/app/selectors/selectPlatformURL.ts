import { config } from '@common/config'
import type { RootState } from '@common/app/store'
import { resolveUriTemplate } from '@linagora/twake-utils'

export const selectPlatformURL = (state: RootState): string | null => {
  const user = state.user.userData
  // Before the user is known a {localpart} template yields `https://.domain`
  if (!user.email) return null
  const workplace = resolveUriTemplate('{workplaceFqdn}', {
    localpart: user.email.split('@')[0],
    workplaceFqdn: user.workplaceFqdn,
    workplaceFqdnFallback: config.WORKPLACE_FQDN_FALLBACK
  })
  return workplace ? `https://${workplace}` : null
}
