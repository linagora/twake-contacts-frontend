/**
 * @jest-environment jsdom
 */

import { resolveUriTemplate } from './uriTemplateUtils'

describe('resolveUriTemplate', () => {
  const originalWorkplaceFqdnFallback = (
    window as Window & { WORKPLACE_FQDN_FALLBACK?: string }
  ).WORKPLACE_FQDN_FALLBACK

  beforeEach(() => {
    delete (window as Window & { WORKPLACE_FQDN_FALLBACK?: string })
      .WORKPLACE_FQDN_FALLBACK
  })

  afterEach(() => {
    if (originalWorkplaceFqdnFallback !== undefined) {
      ;(
        window as Window & { WORKPLACE_FQDN_FALLBACK: string }
      ).WORKPLACE_FQDN_FALLBACK = originalWorkplaceFqdnFallback
    } else {
      delete (window as Window & { WORKPLACE_FQDN_FALLBACK?: string })
        .WORKPLACE_FQDN_FALLBACK
    }
  })

  it('replaces {localpart} placeholder', () => {
    const result = resolveUriTemplate('https://mail.{localpart}.example.com', {
      localpart: 'john'
    })
    expect(result).toBe('https://mail.john.example.com')
  })

  it('replaces {workplaceFqdn} placeholder', () => {
    const result = resolveUriTemplate('https://chat.{workplaceFqdn}/#/chat', {
      workplaceFqdn: 'alice.twake.linagora.com'
    })
    expect(result).toBe('https://chat.alice.twake.linagora.com/#/chat')
  })

  it('replaces {workplaceFqdn.localpart} placeholder', () => {
    const result = resolveUriTemplate(
      'https://{workplaceFqdn.localpart}-chat.example.com',
      { workplaceFqdn: 'alice.twake.linagora.com' }
    )
    expect(result).toBe('https://alice-chat.example.com')
  })

  it('replaces {workplaceFqdn.domain} placeholder', () => {
    const result = resolveUriTemplate(
      'https://chat.{workplaceFqdn.domain}/#/chat',
      { workplaceFqdn: 'alice.twake.linagora.com' }
    )
    expect(result).toBe('https://chat.twake.linagora.com/#/chat')
  })

  it('replaces {target} placeholder with URL encoding', () => {
    const result = resolveUriTemplate(
      'https://chat.example.com/#/chat/@{target}',
      { target: '@bob:twake.linagora.com' }
    )
    // Target is URL-encoded to handle special characters like @ and :
    expect(result).toBe(
      'https://chat.example.com/#/chat/@%40bob%3Atwake.linagora.com'
    )
  })

  it('replaces multiple placeholders', () => {
    const result = resolveUriTemplate(
      'https://{workplaceFqdn.localpart}-chat.{workplaceFqdn.domain}/#/chat/@{target}',
      {
        localpart: 'alice',
        workplaceFqdn: 'alice.twake.linagora.com',
        target: '@bob:twake.linagora.com'
      }
    )
    // Target is URL-encoded, other placeholders are not
    expect(result).toBe(
      'https://alice-chat.twake.linagora.com/#/chat/@%40bob%3Atwake.linagora.com'
    )
  })

  it('uses WORKPLACE_FQDN_FALLBACK when workplaceFqdn is empty', () => {
    ;(
      window as Window & { WORKPLACE_FQDN_FALLBACK: string }
    ).WORKPLACE_FQDN_FALLBACK = 'fallback.twake.linagora.com'

    const result = resolveUriTemplate(
      'https://chat.{workplaceFqdn.domain}/#/chat',
      { localpart: 'john', workplaceFqdn: '' }
    )
    expect(result).toBe('https://chat.twake.linagora.com/#/chat')
  })

  it('replaces {localpart} in WORKPLACE_FQDN_FALLBACK', () => {
    ;(
      window as Window & { WORKPLACE_FQDN_FALLBACK: string }
    ).WORKPLACE_FQDN_FALLBACK = '{localpart}.twake.linagora.com'

    const result = resolveUriTemplate(
      'https://chat.{workplaceFqdn.domain}/#/chat',
      { localpart: 'john', workplaceFqdn: '' }
    )
    expect(result).toBe('https://chat.twake.linagora.com/#/chat')
  })

  it('leaves unknown expressions untouched', () => {
    const result = resolveUriTemplate('https://example.com/{unknown}/path', {
      localpart: 'john'
    })
    expect(result).toBe('https://example.com/{unknown}/path')
  })

  it('handles empty context gracefully', () => {
    const result = resolveUriTemplate(
      'https://example.com/{localpart}/path',
      {}
    )
    expect(result).toBe('https://example.com//path')
  })
})
