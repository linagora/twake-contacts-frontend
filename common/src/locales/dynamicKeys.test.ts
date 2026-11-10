import { translateContactType } from './dynamicKeys'

const t = (key: string): string => `translated:${key}`

describe('translateContactType', () => {
  it('translates a known type', () => {
    expect(translateContactType('work', t)).toBe(
      'translated:contacts.types.work'
    )
  })

  it('ignores the case of the vCard type', () => {
    expect(translateContactType('CELL', t)).toBe(
      'translated:contacts.types.cell'
    )
  })

  it('falls back to the raw type when it has no translation', () => {
    expect(translateContactType('fax', t)).toBe('fax')
  })
})
