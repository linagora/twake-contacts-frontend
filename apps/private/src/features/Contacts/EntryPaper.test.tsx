import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import { EntryPaper } from './EntryPaper'

function renderEntryPaper(onRemove?: () => void): void {
  render(
    <TwakeMuiThemeProvider>
      <I18n dictRequire={() => en} lang="en">
        <EntryPaper
          avatar={null}
          primary="Alice Public Read"
          secondary="alice · 1 contact"
          onRemove={onRemove}
        />
      </I18n>
    </TwakeMuiThemeProvider>
  )
}

describe('EntryPaper', () => {
  it('names the remove button "Remove", not "Close"', async () => {
    const onRemove = jest.fn()
    renderEntryPaper(onRemove)

    expect(
      screen.queryByRole('button', { name: 'Close' })
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('shows a "Remove" tooltip when hovering the remove button', async () => {
    renderEntryPaper(jest.fn())

    await userEvent.hover(screen.getByRole('button', { name: 'Remove' }))

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Remove')
  })

  it('renders no remove button without onRemove', () => {
    renderEntryPaper()

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
