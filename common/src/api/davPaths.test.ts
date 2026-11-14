import {
  bookHref,
  bookJsonHref,
  bookJsonPath,
  bookPath,
  cardFileName,
  cardHref,
  cardIdOf,
  cardPath,
  fromServerBookId,
  toServerBookId,
  userBooksPath,
  userContactsPath
} from './davPaths'

const book = { userId: 'user-1', bookId: 'book-1' }

describe('davPaths', () => {
  it('builds the hrefs of a book and of its cards as Sabre knows them', () => {
    expect(bookHref(book)).toBe('/addressbooks/user-1/book-1')
    expect(bookJsonHref(book)).toBe('/addressbooks/user-1/book-1.json')
    expect(cardHref(book, 'card-1')).toBe(
      '/addressbooks/user-1/book-1/card-1.vcf'
    )
  })

  it('builds the paths behind the API proxy', () => {
    expect(bookPath(book)).toBe('dav/addressbooks/user-1/book-1')
    expect(bookJsonPath(book)).toBe('dav/addressbooks/user-1/book-1.json')
    expect(cardPath(book, 'card-1')).toBe(
      'dav/addressbooks/user-1/book-1/card-1.vcf'
    )
    expect(userBooksPath('user-1')).toBe('dav/addressbooks/user-1.json')
    expect(userContactsPath('user-1')).toBe('dav/contacts/user-1.json')
  })

  it.each([
    ['a slash', 'a/b', 'a%2Fb'],
    ['a space', 'a b', 'a%20b'],
    ['a percent sign', '100%', '100%25'],
    ['a question mark', 'a?b', 'a%3Fb'],
    ['a hash', 'a#b', 'a%23b']
  ])('encodes a card id holding %s', (_, cardId, encoded) => {
    expect(cardPath(book, cardId)).toBe(
      `dav/addressbooks/user-1/book-1/${encoded}.vcf`
    )
  })

  it('encodes the user and book ids', () => {
    const reserved = { userId: 'u/1 %', bookId: 'b/1 %' }

    expect(bookJsonPath(reserved)).toBe(
      'dav/addressbooks/u%2F1%20%25/b%2F1%20%25.json'
    )
    expect(cardHref(reserved, 'c')).toBe(
      '/addressbooks/u%2F1%20%25/b%2F1%20%25/c.vcf'
    )
    expect(userBooksPath('u/1')).toBe('dav/addressbooks/u%2F1.json')
    expect(userContactsPath('u/1')).toBe('dav/contacts/u%2F1.json')
  })

  it('keeps "@" and ":" as Sabre writes them', () => {
    expect(cardPath(book, 'uid@host:1')).toBe(
      'dav/addressbooks/user-1/book-1/uid@host:1.vcf'
    )
  })

  it.each([
    ['u1.vcf', 'u1'],
    ['x.vcfy.vcf', 'x.vcfy'],
    ['x.VCF', 'x.VCF/'],
    ['abc', 'abc/'],
    ['', '']
  ])('round trips the card file name %s through its id', (fileName, id) => {
    expect(cardIdOf(fileName)).toBe(id)
    if (fileName) expect(cardFileName(id)).toBe(fileName)
  })

  it('addresses a card whose file name does not end in ".vcf" by it (#623)', () => {
    expect(cardPath(book, cardIdOf('x.VCF'))).toBe(
      'dav/addressbooks/user-1/book-1/x.VCF'
    )
    expect(cardHref(book, cardIdOf('a b'))).toBe(
      '/addressbooks/user-1/book-1/a%20b'
    )
  })

  it.each([['.'], ['..']])(
    'refuses to address a card named %s, which would reach another resource',
    fileName => {
      const id = cardIdOf(fileName)

      expect(() => cardPath(book, id)).toThrow()
      expect(() => cardHref(book, id)).toThrow()
    }
  )

  it('still addresses a card named "..vcf"', () => {
    expect(cardPath(book, cardIdOf('..vcf'))).toBe(
      'dav/addressbooks/user-1/book-1/..vcf'
    )
  })

  it('maps the domain book between its store and server ids', () => {
    expect(toServerBookId('dab')).toBe('domain-members')
    expect(toServerBookId('book-1')).toBe('book-1')
    expect(fromServerBookId('domain-members')).toBe('dab')
    expect(fromServerBookId('book-1')).toBe('book-1')
  })
})
