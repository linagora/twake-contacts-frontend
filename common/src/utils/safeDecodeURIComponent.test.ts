import { safeDecodeURIComponent } from './safeDecodeURIComponent'

describe('safeDecodeURIComponent', () => {
  it('decodes percent escapes', () => {
    expect(safeDecodeURIComponent('a%2Fb%20c')).toBe('a/b c')
  })

  it('keeps a value that is not valid percent-encoding as is', () => {
    expect(safeDecodeURIComponent('100%')).toBe('100%')
  })
})
