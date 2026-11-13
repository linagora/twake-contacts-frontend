import { normalizeIdentity, stripMailto } from './normalizeIdentity'

describe('stripMailto', () => {
  it.each([
    ['MAILTO:c@x.example', 'c@x.example'],
    ['Mailto:e@x.example', 'e@x.example'],
    [' d@x.example ', 'd@x.example'],
    ['mailto:g@x.example?subject=Hi', 'g@x.example'],
    ['mailto:h%40x.example', 'h@x.example'],
    ['mailto:bad%zz@x.example', 'bad%zz@x.example'],
    ['plain%40x.example', 'plain%40x.example'],
    [undefined, '']
  ])('reads the address of %j', (raw, expected) => {
    expect(stripMailto(raw)).toBe(expected)
  })
})

describe('normalizeIdentity', () => {
  it('compares the address of a mailto URI case-insensitively', () => {
    expect(normalizeIdentity('MAILTO:Alice%40X.example?cc=b@x.example')).toBe(
      'alice@x.example'
    )
  })
})
