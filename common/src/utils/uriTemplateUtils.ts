/**
 * Utilities to resolve URI templates used by platform-mode configuration
 * entries such as CHAT_SPA_URL and MAIL_SPA_URL.
 */

/**
 * Context used to resolve the expressions of a URI template.
 */
export interface UriTemplateContext {
  localpart?: string
  workplaceFqdn?: string
  target?: string
}

/**
 * Resolve the workplace FQDN to use, falling back to the
 * WORKPLACE_FQDN_FALLBACK configuration entry when the OIDC provider did not
 * supply one.
 *
 * WORKPLACE_FQDN_FALLBACK is itself a template supporting {localpart}, e.g.
 * '{localpart}.twake.linagora.com'.
 */
function resolveWorkplaceFqdn(
  workplaceFqdn: string | undefined,
  localpart: string
): string {
  if (workplaceFqdn) return workplaceFqdn

  const fallback = window.WORKPLACE_FQDN_FALLBACK
  if (!fallback) return ''

  return fallback.replace(/\{localpart\}/g, localpart)
}

/**
 * Resolve a URI-template (RFC 6570 style) configuration value.
 *
 * Supported expressions:
 *  - {localpart}               the user local part
 *  - {workplaceFqdn}           the full workplace FQDN (e.g. tmle.stg.lin-saas.com)
 *  - {workplaceFqdn.localpart} the first label of the FQDN (e.g. tmle)
 *  - {workplaceFqdn.domain}    the FQDN without its first label (e.g. stg.lin-saas.com)
 *  - {target}                  the target username for chat url
 *
 * When no workplace FQDN is available in the context, the
 * WORKPLACE_FQDN_FALLBACK configuration entry is used instead.
 *
 * Unknown expressions are left untouched.
 */
export function resolveUriTemplate(
  template: string,
  { localpart = '', workplaceFqdn = '', target = '' }: UriTemplateContext
): string {
  const effectiveFqdn = resolveWorkplaceFqdn(workplaceFqdn, localpart)
  const [fqdnLocalpart = '', ...fqdnRest] = effectiveFqdn.split('.')
  const fqdnDomain = fqdnRest.join('.')

  const values: Record<string, string> = {
    localpart,
    workplaceFqdn: effectiveFqdn,
    'workplaceFqdn.localpart': fqdnLocalpart,
    'workplaceFqdn.domain': fqdnDomain,
    target: encodeURIComponent(target)
  }

  return template.replace(/\{([^}]+)\}/g, (match, expression: string) => {
    const key = expression.trim()
    return key in values ? values[key] : match
  })
}
