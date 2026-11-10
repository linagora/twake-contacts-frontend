import { fireEvent, render, screen } from '@testing-library/react'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { Phone } from '@linagora/twake-icons'
import { useState } from 'react'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import { EntryList } from './EntryList'
import { ContactFormEntry } from './types'

const mockUseBreakpoints = vi.hoisted(() =>
  vi.fn(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isExtraLarge: false
  }))
)

vi.mock('@linagora/twake-mui', async () => {
  const actual = await vi.importActual<typeof import('@linagora/twake-mui')>(
    '@linagora/twake-mui'
  )
  return {
    ...actual,
    useBreakpoints: () => mockUseBreakpoints()
  }
})

function renderWithProviders(
  ui: React.ReactElement
): ReturnType<typeof render> {
  return render(
    <TwakeMuiThemeProvider>
      <I18n dictRequire={() => en} lang="en">
        {ui}
      </I18n>
    </TwakeMuiThemeProvider>
  )
}

describe('EntryList', () => {
  beforeEach(() => {
    mockUseBreakpoints.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isExtraLarge: false
    })
  })

  it('renders desktop grid sizes with type selector', () => {
    const { container } = renderWithProviders(
      <EntryList
        icon={Phone}
        entries={[{ type: 'home', value: '123' }]}
        types={['home', 'work']}
        label="Phone"
        onChange={vi.fn()}
        onRemove={vi.fn()}
        showTypeSelector={true}
      />
    )

    const gridItems = container.querySelectorAll('.MuiGrid-root')
    expect(gridItems[1]).toHaveClass('MuiGrid-grid-xs-5')
    expect(gridItems[2]).toHaveClass('MuiGrid-grid-xs-3')
    expect(gridItems[3]).toHaveClass('MuiGrid-grid-xs-1')
  })

  it.each([
    {
      name: 'a single entry with type selector',
      entries: [{ type: 'home', value: '123' }],
      showTypeSelector: true,
      sizes: [8, 4]
    },
    {
      name: 'a single entry without type selector',
      entries: [{ type: '', value: 'alice@example.com' }],
      showTypeSelector: false,
      sizes: [12]
    },
    {
      name: 'multiple entries with type selector',
      entries: [
        { type: 'home', value: '123' },
        { type: 'work', value: '456' }
      ],
      showTypeSelector: true,
      sizes: [6, 4, 2]
    },
    {
      name: 'multiple entries without type selector',
      entries: [
        { type: '', value: 'alice@example.com' },
        { type: '', value: 'bob@example.com' }
      ],
      showTypeSelector: false,
      sizes: [10, 2]
    }
  ])(
    'renders mobile full grid for $name',
    ({ entries, showTypeSelector, sizes }) => {
      mockUseBreakpoints.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isExtraLarge: false
      })

      const { container } = renderWithProviders(
        <EntryList
          icon={Phone}
          entries={entries}
          types={showTypeSelector ? ['home', 'work'] : []}
          label={showTypeSelector ? 'Phone' : 'Email'}
          onChange={vi.fn()}
          onRemove={vi.fn()}
          showTypeSelector={showTypeSelector}
        />
      )

      const rows = container.querySelectorAll('.MuiGrid-container')
      expect(rows).toHaveLength(entries.length)
      rows.forEach(row => {
        const items = row.querySelectorAll(':scope > .MuiGrid-root')
        expect(items).toHaveLength(sizes.length)
        sizes.forEach((size, index) => {
          expect(items[index]).toHaveClass(`MuiGrid-grid-xs-${size}`)
        })
      })
      if (entries.length > 1 && showTypeSelector) {
        expect(
          screen.getByRole('button', { name: 'Remove' })
        ).toBeInTheDocument()
      }
    }
  )

  describe('focus after removing a row', () => {
    const StatefulEntryList: React.FC<{ initial: ContactFormEntry[] }> = ({
      initial
    }) => {
      const [entries, setEntries] = useState(initial)
      return (
        <EntryList
          icon={Phone}
          entries={entries}
          types={['home', 'work']}
          label="Phone"
          onChange={vi.fn()}
          onRemove={index =>
            setEntries(previous => previous.filter((_, i) => i !== index))
          }
        />
      )
    }

    const removeButtons = (): HTMLElement[] =>
      screen.getAllByRole('button', { name: 'Remove' })

    const phoneInput = (value: string): HTMLElement =>
      screen.getByDisplayValue(value)

    it('focuses the value of the row taking the place of the removed one', () => {
      renderWithProviders(
        <StatefulEntryList
          initial={[
            { type: 'home', value: '1' },
            { type: 'work', value: '2' },
            { type: 'home', value: '3' }
          ]}
        />
      )

      fireEvent.click(removeButtons()[0])

      expect(phoneInput('3')).toHaveFocus()
    })

    it('focuses the value of the previous row when the last row is removed', () => {
      renderWithProviders(
        <StatefulEntryList
          initial={[
            { type: 'home', value: '1' },
            { type: 'work', value: '2' }
          ]}
        />
      )

      fireEvent.click(removeButtons()[0])

      expect(phoneInput('1')).toHaveFocus()
    })
  })
})
