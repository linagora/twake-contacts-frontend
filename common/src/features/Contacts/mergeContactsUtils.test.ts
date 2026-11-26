import { classifyAddressBooks } from './addressBookModel'
import {
  BookAudience,
  isAudienceWithin,
  PRIVATE_AUDIENCE
} from './bookAudience'
import { DEFAULT_ADDRESS_BOOK_ID } from './constants'
import { Contact, RawAddressBook } from './contactsTypes'
import { JCalProperty } from './davTypes'
import {
  duplicateContactUrn,
  duplicateDismissalProperty
} from './duplicateDismissals'
import { DuplicateContactEntry } from './mergeContactsTypes'
import {
  buildMergedContactPlan,
  findDuplicateContactGroups,
  isPersonalMergeableBook,
  MergeContactError
} from './mergeContactsUtils'

const makeBook = (overrides: Partial<RawAddressBook>): RawAddressBook => ({
  id: 'book',
  userId: 'u1',
  name: 'Book',
  contactsCount: 0,
  acl: [],
  canWrite: true,
  ...overrides
})

describe('mergeContactsUtils', () => {
  it('detects duplicates by linearly walking name, email, and phone lists', () => {
    const groups = findDuplicateContactGroups([
      {
        addressBookId: DEFAULT_ADDRESS_BOOK_ID,
        contact: {
          id: 'c1',
          displayName: 'Isabella Martinez',
          emails: [{ type: null, value: 'MAIL@twake.app' }],
          phones: [{ type: 'cell', value: '+33 6 50 24 49 1' }]
        }
      },
      {
        addressBookId: 'personal1',
        contact: {
          id: 'c2',
          displayName: 'Isabella Work',
          emails: [],
          phones: [{ type: 'cell', value: '+3365024491' }]
        }
      },
      {
        addressBookId: 'personal1',
        contact: {
          id: 'c3',
          displayName: '  isabella   martinez ',
          emails: [],
          phones: []
        }
      },
      {
        addressBookId: DEFAULT_ADDRESS_BOOK_ID,
        contact: {
          id: 'c4',
          displayName: 'Robert Rodrigez',
          emails: [{ type: null, value: 'mail@twake.app' }],
          phones: []
        }
      },
      {
        addressBookId: DEFAULT_ADDRESS_BOOK_ID,
        contact: {
          id: 'c5',
          displayName: 'Unique Person',
          emails: [{ type: null, value: 'unique@twake.app' }],
          phones: [{ type: 'cell', value: '+3311111111' }]
        }
      }
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].entries.map(e => e.contact.id)).toEqual([
      'c1',
      'c2',
      'c3',
      'c4'
    ])
  })

  it('finds duplicates within the same address book as well as across address books', () => {
    const groups = findDuplicateContactGroups([
      {
        addressBookId: DEFAULT_ADDRESS_BOOK_ID,
        contact: {
          id: 'same-book-1',
          displayName: 'Alice',
          emails: [{ type: null, value: 'alice@twake.app' }],
          phones: []
        }
      },
      {
        addressBookId: DEFAULT_ADDRESS_BOOK_ID,
        contact: {
          id: 'same-book-2',
          displayName: 'Alice Dupont',
          emails: [{ type: null, value: 'alice@twake.app' }],
          phones: []
        }
      },
      {
        addressBookId: 'personal1',
        contact: {
          id: 'cross-book-1',
          displayName: 'Bob',
          emails: [],
          phones: [{ type: 'cell', value: '+33600000001' }]
        }
      },
      {
        addressBookId: 'personal2',
        contact: {
          id: 'cross-book-2',
          displayName: 'Bob Work',
          emails: [],
          phones: [{ type: 'work', value: '+33600000001' }]
        }
      }
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0].entries.map(e => e.contact.id)).toEqual([
      'same-book-1',
      'same-book-2'
    ])
    expect(groups[1].entries.map(e => e.contact.id)).toEqual([
      'cross-book-1',
      'cross-book-2'
    ])
  })

  it('detects duplicates with the same Matrix ID', () => {
    const groups = findDuplicateContactGroups([
      {
        addressBookId: DEFAULT_ADDRESS_BOOK_ID,
        contact: {
          id: 'm1',
          displayName: 'Isabella Martinez',
          emails: [],
          socialProfiles: [{ type: 'matrix', value: '@Isabella:twake.app' }]
        }
      },
      {
        addressBookId: 'personal1',
        contact: {
          id: 'm2',
          displayName: 'Isabella Work',
          emails: [],
          socialProfiles: [{ type: 'matrix', value: ' @isabella:twake.app ' }]
        }
      }
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].entries.map(e => e.contact.id)).toEqual(['m1', 'm2'])
  })

  it('keeps a declined cross-book pair separate even through another matching card', () => {
    const first: DuplicateContactEntry = {
      addressBookId: 'work',
      contact: {
        id: 'copied-id',
        displayName: 'Alex Work',
        emails: [{ type: 'work', value: 'alex@example.org' }],
        phones: [{ type: null, value: '123' }]
      }
    }
    const second = {
      addressBookId: 'family',
      contact: {
        id: 'copied-id',
        displayName: 'Alex',
        emails: [{ type: 'home', value: 'alex@example.org' }]
      }
    }
    const bridge = {
      addressBookId: 'personal',
      contact: {
        id: 'bridge',
        displayName: 'Alex',
        emails: [],
        phones: [{ type: null, value: '123' }]
      }
    }
    first.contact.passthroughProps = [
      duplicateDismissalProperty(duplicateContactUrn(second))
    ]

    expect(findDuplicateContactGroups([first, second])).toEqual([])
    expect(
      findDuplicateContactGroups([first, second, bridge]).map(
        group => group.entries
      )
    ).toEqual([[second, bridge]])
  })

  it('still suggests a new match for contacts sharing a dismissed key', () => {
    const entries: DuplicateContactEntry[] = ['first', 'second', 'third'].map(
      id => ({
        addressBookId: 'contacts',
        contact: { id, displayName: 'Same Name', emails: [] }
      })
    )
    const [first, second, third] = entries
    second.contact.passthroughProps = [
      duplicateDismissalProperty(duplicateContactUrn(first))
    ]

    expect(
      findDuplicateContactGroups(entries).map(group => group.entries)
    ).toEqual([[first, third]])
  })

  it('picks the most complete contact, keeps its name, merges missing phone/email/matrix ID, and deletes others', () => {
    const plan = buildMergedContactPlan([
      {
        addressBookId: DEFAULT_ADDRESS_BOOK_ID,
        contact: {
          id: 'sparse',
          displayName: 'Isabella Work',
          emails: [{ type: 'work', value: 'work@twake.app' }],
          phones: [{ type: 'cell', value: '+3365024491' }],
          socialProfiles: [{ type: 'matrix', value: '@isabella:twake.app' }]
        }
      },
      {
        addressBookId: 'personal1',
        contact: {
          id: 'complete',
          displayName: 'Isabella Martinez',
          emails: [
            { type: 'home', value: 'mail@twake.app' },
            { type: 'work', value: 'work@twake.app' }
          ],
          phones: [
            { type: 'cell', value: '+3365024491' },
            { type: 'work', value: '+3369999999' }
          ]
        }
      }
    ])

    expect(plan.targetAddressBookId).toBe('personal1')
    expect(plan.updatedContact.id).toBe('complete')
    expect(plan.updatedContact.displayName).toBe('Isabella Martinez')
    expect(plan.updatedContact.emails).toEqual([
      { type: 'home', value: 'mail@twake.app' },
      { type: 'work', value: 'work@twake.app' }
    ])
    expect(plan.updatedContact.phones).toEqual([
      { type: 'cell', value: '+3365024491' },
      { type: 'work', value: '+3369999999' }
    ])
    expect(plan.updatedContact.socialProfiles).toEqual([
      { type: 'matrix', value: '@isabella:twake.app' }
    ])
    expect(plan.toDelete).toEqual([
      { addressBookId: DEFAULT_ADDRESS_BOOK_ID, contactId: 'sparse' }
    ])
  })

  it('ignores non-Matrix profiles when detecting duplicates', () => {
    const entries = ['skype', 'twitter', 'matrix'].map((type, index) => ({
      addressBookId: 'contacts',
      contact: {
        id: String(index),
        displayName: `Person ${index}`,
        emails: [],
        socialProfiles: [{ type, value: 'alex' }]
      }
    }))
    expect(findDuplicateContactGroups(entries)).toEqual([])
  })

  it('scores the primary by email, phone and Matrix while preserving other profiles', () => {
    const secondaryProfiles = [
      { type: 'skype', value: 'Alex' },
      { type: 'twitter', value: 'alex' }
    ]
    const matrix = { type: 'Matrix', value: '@alex:example.org' }
    const plan = buildMergedContactPlan([
      {
        addressBookId: 'family',
        contact: {
          id: 'secondary',
          displayName: 'Alex',
          emails: [],
          socialProfiles: secondaryProfiles
        }
      },
      {
        addressBookId: 'work',
        contact: {
          id: 'primary',
          displayName: 'Alex',
          emails: [],
          socialProfiles: [matrix]
        }
      }
    ])

    expect(plan.targetAddressBookId).toBe('work')
    expect(plan.updatedContact.id).toBe('primary')
    expect(plan.updatedContact.socialProfiles).toEqual([
      matrix,
      ...secondaryProfiles
    ])
  })

  it('preserves profiles from different services and case-sensitive non-Matrix values', () => {
    const profiles = [
      { type: 'skype', value: 'Alex' },
      { type: 'twitter', value: 'Alex' },
      { type: 'skype', value: 'alex' },
      { type: 'matrix', value: '@Alex:example.org' },
      { type: 'MATRIX', value: ' @alex:example.org ' }
    ]
    const plan = buildMergedContactPlan(
      profiles.map((profile, index) => ({
        addressBookId: 'contacts',
        contact: {
          id: String(index),
          displayName: 'Alex',
          emails: [],
          socialProfiles: [profile]
        }
      }))
    )
    expect(plan.updatedContact.socialProfiles).toEqual([
      profiles[3],
      ...profiles.slice(0, 3)
    ])
  })

  it('preserves addresses, notes, arrays, and unedited vCard details from a duplicate', () => {
    const details: Partial<Contact> = {
      addresses: [
        {
          type: 'home',
          poBox: '',
          extended: '',
          street: 'Street',
          locality: '',
          region: '',
          postalCode: '',
          country: ''
        }
      ],
      note: 'Keep this note',
      nicknames: ['Al'],
      categories: ['Friends'],
      urls: [{ value: 'https://example.org' }],
      org: { name: 'Company', units: [] },
      title: 'Engineer',
      role: 'Developer',
      birthday: '1990-01-01',
      name: { familyName: 'Smith', givenName: 'Alex' },
      passthroughProps: [['x-custom', {}, 'text', 'Keep me']]
    }
    const plan = buildMergedContactPlan([
      {
        addressBookId: 'contacts',
        contact: {
          id: 'primary',
          displayName: 'Alex',
          emails: [
            { type: null, value: 'a@example.org' },
            { type: null, value: 'b@example.org' }
          ]
        }
      },
      {
        addressBookId: 'contacts',
        contact: {
          id: 'duplicate',
          displayName: 'Alex',
          emails: [],
          ...details
        }
      }
    ])
    expect(plan.updatedContact).toMatchObject(details)
    expect(plan.toDelete).toEqual([
      { addressBookId: 'contacts', contactId: 'duplicate' }
    ])
  })

  const expectConflict = (
    buildPatch: (value: string, index: number) => Partial<Contact>
  ): void => {
    expect(() =>
      buildMergedContactPlan(
        ['first', 'second'].map((value, index) => ({
          addressBookId: 'contacts',
          contact: {
            id: value,
            displayName: 'Alex',
            emails: [],
            ...buildPatch(value, index)
          }
        }))
      )
    ).toThrow('conflict')
  }

  it.each(['note', 'birthday', 'title', 'role'] as const)(
    'blocks conflicting %s before creating a deletion plan',
    key => {
      expectConflict(value => ({ [key]: value }))
    }
  )

  it('keeps primary name metadata and unions carried groups when opaque fields agree', () => {
    const plan = buildMergedContactPlan([
      {
        addressBookId: 'contacts',
        contact: {
          id: 'primary',
          displayName: 'Isabella Martinez',
          emails: [{ type: null, value: 'a@example.org' }],
          phones: [{ type: 'cell', value: '+3365024491' }],
          name: { givenName: 'Isabella', familyName: 'Martinez' },
          birthday: '1990-01-01',
          birthdayProp: ['bday', {}, 'date', '1990-01-01'],
          propertyParams: { fn: { language: 'en' } },
          passthroughProps: [['rev', {}, 'timestamp', '2026-01-01T00:00:00Z']],
          carriedGroups: ['item1']
        }
      },
      {
        addressBookId: 'contacts',
        contact: {
          id: 'duplicate',
          displayName: 'Isabella Work',
          emails: [],
          phones: [{ type: 'cell', value: '+3365024491' }],
          name: { givenName: 'Isabella', familyName: 'Work' },
          birthday: '1990-01-01',
          birthdayProp: ['bday', {}, 'date', '19900101'],
          propertyParams: { fn: { language: 'fr' } },
          passthroughProps: [['rev', {}, 'timestamp', '2026-01-01T00:00:00Z']],
          carriedGroups: ['item2']
        }
      }
    ])

    expect(plan.updatedContact.name).toEqual({
      givenName: 'Isabella',
      familyName: 'Martinez'
    })
    expect(plan.updatedContact.passthroughProps).toEqual([
      ['rev', {}, 'timestamp', '2026-01-01T00:00:00Z']
    ])
    expect(plan.updatedContact.propertyParams).toEqual({
      fn: { language: 'en' }
    })
    expect(plan.updatedContact.carriedGroups).toEqual(['item1', 'item2'])
    expect(plan.toDelete).toEqual([
      { addressBookId: 'contacts', contactId: 'duplicate' }
    ])
  })

  it('keeps the primary REV and PRODID when a source has different metadata', () => {
    const primaryProps: JCalProperty[] = [
      ['rev', {}, 'timestamp', '2026-01-01T00:00:00Z'],
      ['prodid', {}, 'text', 'Primary client']
    ]
    const secondaryProps: JCalProperty[] = [
      ['REV', {}, 'timestamp', '2026-01-02T00:00:00Z'],
      ['PRODID', {}, 'text', 'Secondary client']
    ]
    const entries = ['primary', 'secondary'].map((id, index) => ({
      addressBookId: 'contacts',
      contact: {
        id,
        displayName: 'Alex',
        emails: [],
        passthroughProps: index === 0 ? primaryProps : secondaryProps
      }
    }))

    expect(
      buildMergedContactPlan(entries).updatedContact.passthroughProps
    ).toEqual(primaryProps)
    expect(
      buildMergedContactPlan([
        {
          ...entries[0],
          contact: { ...entries[0].contact, passthroughProps: [] }
        },
        entries[1]
      ]).updatedContact.passthroughProps
    ).toEqual([])
  })

  it('keeps distinct dismissal markers from both cards when merging', () => {
    const properties = ['family', 'work'].map(book =>
      duplicateDismissalProperty(`urn:twake:contact:${book}:peer`)
    )
    const entries = ['primary', 'secondary'].map((id, index) => ({
      addressBookId: 'contacts',
      contact: {
        id,
        displayName: 'Alex',
        emails: [],
        passthroughProps: [properties[index]]
      }
    }))
    expect(
      buildMergedContactPlan(entries).updatedContact.passthroughProps
    ).toEqual(properties)
  })

  it('blocks conflicting KIND properties before creating a deletion plan', () => {
    expectConflict((value, index) => ({
      passthroughProps: [[index === 0 ? 'kind' : 'KIND', {}, 'text', value]]
    }))
  })

  it('preserves distinct opaque properties and repeatable media without mutating candidates', () => {
    const primary: Contact = {
      id: 'primary',
      displayName: 'Alex',
      emails: [],
      passthroughProps: [
        ['x-custom', { language: 'en' }, 'text', 'Keep'],
        ['photo', {}, 'uri', 'https://example.org/first.jpg']
      ],
      carriedGroups: ['item1']
    }
    const incoming: JCalProperty[] = [
      ['X-CUSTOM', { language: 'en' }, 'text', 'Keep'],
      ['x-other', {}, 'text', 'Also keep'],
      ['photo', {}, 'uri', 'https://example.org/second.jpg'],
      ['sound', {}, 'uri', 'https://example.org/first.wav'],
      ['sound', {}, 'uri', 'https://example.org/second.wav']
    ]
    const original = structuredClone(primary)
    const plan = buildMergedContactPlan([
      { addressBookId: 'contacts', contact: primary },
      {
        addressBookId: 'contacts',
        contact: {
          id: 'duplicate',
          displayName: 'Alex',
          emails: [],
          passthroughProps: incoming,
          carriedGroups: ['item1', 'item2']
        }
      }
    ])
    expect(plan.updatedContact.passthroughProps).toEqual([
      ...(original.passthroughProps ?? []),
      ...incoming.slice(1)
    ])
    expect(plan.updatedContact.carriedGroups).toEqual(['item1', 'item2'])
    expect(primary).toEqual(original)
    expect(plan.toDelete).toHaveLength(1)
  })

  it('copies an opaque property set intact when absent from the target', () => {
    const passthroughProps: JCalProperty[] = [
      ['x-custom', {}, 'text', 'First'],
      ['x-custom', {}, 'text', 'Second'],
      ['x-other', {}, 'text', 'First']
    ]
    const plan = buildMergedContactPlan([
      {
        addressBookId: 'contacts',
        contact: { id: 'primary', displayName: 'Alex', emails: [] }
      },
      {
        addressBookId: 'contacts',
        contact: {
          id: 'duplicate',
          displayName: 'Alex',
          emails: [],
          passthroughProps
        }
      }
    ])
    expect(plan.updatedContact.passthroughProps).toEqual(passthroughProps)
  })

  it('preserves X- properties with distinct values or parameters', () => {
    const primaryProp: JCalProperty = [
      'x-custom',
      { language: 'en' },
      'text',
      'First'
    ]
    const incoming: JCalProperty[] = [
      ['X-CUSTOM', { language: 'en' }, 'text', 'First'],
      ['x-custom', { language: 'fr' }, 'text', 'First'],
      ['x-custom', { language: 'en' }, 'text', 'Second']
    ]
    const plan = buildMergedContactPlan(
      [[primaryProp], incoming].map((passthroughProps, index) => ({
        addressBookId: 'contacts',
        contact: {
          id: String(index),
          displayName: 'Alex',
          emails: [],
          passthroughProps
        }
      }))
    )

    expect(plan.updatedContact.passthroughProps).toEqual([
      primaryProp,
      ...incoming.slice(1)
    ])
    expect(plan.toDelete).toHaveLength(1)
  })

  it('lists all conflicting fields on MergeContactError', () => {
    let caught: unknown
    try {
      buildMergedContactPlan([
        {
          addressBookId: 'contacts',
          contact: {
            id: 'c1',
            displayName: 'Alex',
            emails: [],
            org: { name: 'Acme', units: [] },
            note: 'First note',
            passthroughProps: [['x-custom', {}, 'text', 'A']]
          }
        },
        {
          addressBookId: 'contacts',
          contact: {
            id: 'c2',
            displayName: 'Alex',
            emails: [],
            org: { name: 'Beta', units: [] },
            note: 'Second note',
            passthroughProps: [['x-custom', {}, 'text', 'B']]
          }
        }
      ])
    } catch (err) {
      caught = err
    }

    expect(caught).toMatchObject({
      reason: 'conflict',
      conflictFields: ['org', 'note']
    })
  })

  it('deduplicates same email and phone values with different labels, keeping primary', () => {
    const plan = buildMergedContactPlan(
      ['home', 'work'].map(type => ({
        addressBookId: 'contacts',
        contact: {
          id: type,
          displayName: 'Alex',
          emails: [
            {
              type,
              value: 'a@example.org',
              params: { pref: type === 'home' ? '1' : '2' }
            }
          ],
          phones: [{ type, value: '123' }]
        }
      }))
    )
    expect(plan.updatedContact.emails).toEqual([
      { type: 'home', value: 'a@example.org', params: { pref: '1' } }
    ])
    expect(plan.updatedContact.phones).toEqual([{ type: 'home', value: '123' }])
  })

  it('allows only default and personal books for deduplication', () => {
    const books = classifyAddressBooks(
      {
        [DEFAULT_ADDRESS_BOOK_ID]: makeBook({
          id: DEFAULT_ADDRESS_BOOK_ID,
          name: 'My contacts'
        }),
        personal1: makeBook({ id: 'personal1', name: 'Work' }),
        collected: makeBook({ id: 'collected', name: 'Collected' }),
        dab: makeBook({ id: 'dab', name: 'Domain' }),
        shared1: makeBook({ id: 'shared1', ownerId: 'u2', name: 'Shared' }),
        delegated1: makeBook({
          id: 'delegated1',
          ownerId: 'u3',
          shareAccess: 2,
          name: 'Delegated'
        })
      },
      'u1'
    )

    const mergeableIds = Object.values(books)
      .filter(isPersonalMergeableBook)
      .map(book => book.id)

    expect(mergeableIds).toEqual([DEFAULT_ADDRESS_BOOK_ID, 'personal1'])
  })
})

describe('buildMergedContactPlan target book', () => {
  const sparseInDefault: DuplicateContactEntry = {
    addressBookId: DEFAULT_ADDRESS_BOOK_ID,
    contact: {
      id: 'private',
      displayName: 'John Smith',
      emails: [],
      phones: [{ type: 'cell', value: '+3365024491' }],
      note: 'Private note'
    }
  }
  const richInShared: DuplicateContactEntry = {
    addressBookId: 'team',
    contact: {
      id: 'planted',
      displayName: 'John Smith',
      emails: [
        { type: 'work', value: 'john@attacker.example' },
        { type: 'home', value: 'john@home.example' }
      ]
    }
  }
  const sharedWith = (...members: string[]): BookAudience => ({
    isPublic: false,
    members
  })

  it('writes the merged card into the private book, not a richer shared copy', () => {
    const plan = buildMergedContactPlan(
      [sparseInDefault, richInShared],
      new Map([
        [DEFAULT_ADDRESS_BOOK_ID, PRIVATE_AUDIENCE],
        ['team', sharedWith('mallory')]
      ])
    )

    expect(plan.targetAddressBookId).toBe(DEFAULT_ADDRESS_BOOK_ID)
    expect(plan.updatedContact.id).toBe('private')
    expect(plan.toDelete).toEqual([
      { addressBookId: 'team', contactId: 'planted' }
    ])
  })

  it('writes the merged card into an unpublished book rather than a published one', () => {
    const plan = buildMergedContactPlan(
      [sparseInDefault, richInShared],
      new Map([
        [DEFAULT_ADDRESS_BOOK_ID, sharedWith('bob')],
        ['team', { isPublic: true, members: [] }]
      ])
    )

    expect(plan.targetAddressBookId).toBe(DEFAULT_ADDRESS_BOOK_ID)
  })

  it('picks the most complete copy among books with the same audience', () => {
    const plan = buildMergedContactPlan(
      [sparseInDefault, richInShared],
      new Map([
        [DEFAULT_ADDRESS_BOOK_ID, sharedWith('bob')],
        ['team', sharedWith('bob')]
      ])
    )

    expect(plan.targetAddressBookId).toBe('team')
  })

  it('refuses to merge copies of books shared with different users', () => {
    expect(() =>
      buildMergedContactPlan(
        [sparseInDefault, richInShared],
        new Map([
          [DEFAULT_ADDRESS_BOOK_ID, sharedWith('bob')],
          ['team', sharedWith('mallory')]
        ])
      )
    ).toThrow(new MergeContactError('audience'))
  })
})

describe('isAudienceWithin', () => {
  it('nests a private book in any audience, and any audience in a published one', () => {
    const shared = { isPublic: false, members: ['bob'] }
    const published = { isPublic: true, members: [] }

    expect(isAudienceWithin(PRIVATE_AUDIENCE, shared)).toBe(true)
    expect(isAudienceWithin(shared, PRIVATE_AUDIENCE)).toBe(false)
    expect(isAudienceWithin(shared, published)).toBe(true)
    expect(isAudienceWithin(published, shared)).toBe(false)
    expect(
      isAudienceWithin(shared, { isPublic: false, members: ['bob', 'eve'] })
    ).toBe(true)
  })
})
