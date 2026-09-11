import { fireEvent, render, screen } from '@testing-library/react'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import { ContactFormDialog } from './ContactFormDialog'

describe('ContactFormDialog', () => {
  it('adds entries and submits the form values', () => {
    const onSubmit = jest.fn()
    render(
      <I18n dictRequire={() => en} lang="en">
        <ContactFormDialog
          title="Create contact"
          addressBooks={[
            { id: 'book1', userId: 'u1', name: 'Book 1', contactsCount: 0 }
          ]}
          categoryOptions={[]}
          onClose={jest.fn()}
          onSubmit={onSubmit}
        />
      </I18n>
    )

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Alice' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add phone' }))
    const phones = screen.getAllByLabelText('Phone')
    expect(phones).toHaveLength(2)
    fireEvent.change(phones[1], { target: { value: '+33600000000' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        addressBookId: 'book1',
        givenName: 'Alice',
        phones: [
          { type: 'cell', value: '' },
          { type: 'cell', value: '+33600000000' }
        ]
      })
    )
  })
})
