import { Contact } from '@common/features/Contacts/contactsTypes'
import { makeContactFromForm, makeFormValuesFromContact } from './types'

const makeContact = (): Contact => ({
  id: 'c-1',
  displayName: 'Jane Doe',
  name: { givenName: 'Jane', familyName: 'Doe' },
  emails: [],
  addresses: [
    {
      type: 'work',
      poBox: '',
      extended: 'Building B',
      street: '10 Avenue des Champs',
      locality: 'Paris',
      region: '',
      postalCode: '75008',
      country: 'France'
    }
  ]
})

describe('contact form addresses', () => {
  it('shows every address component in the edit form', () => {
    const values = makeFormValuesFromContact(makeContact(), 'contacts')
    expect(values.addresses).toEqual([
      {
        type: 'work',
        value: 'Building B, 10 Avenue des Champs, 75008, Paris, France'
      }
    ])
  })

  it('keeps an untouched address unchanged on save', () => {
    const contact = makeContact()
    const values = {
      ...makeFormValuesFromContact(contact, 'contacts'),
      familyName: 'Smith'
    }
    expect(makeContactFromForm(values, contact).addresses).toEqual(
      contact.addresses
    )
  })

  it('keeps a street only address on save', () => {
    const contact: Contact = {
      ...makeContact(),
      addresses: [
        {
          type: null,
          poBox: '',
          extended: '',
          street: '1 rue de Paris',
          locality: '',
          region: '',
          postalCode: '',
          country: ''
        }
      ]
    }
    const values = makeFormValuesFromContact(contact, 'contacts')
    expect(values.addresses[0].value).toBe('1 rue de Paris')
    expect(makeContactFromForm(values, contact).addresses).toEqual([
      { ...contact.addresses?.[0], type: 'other' }
    ])
  })
})
