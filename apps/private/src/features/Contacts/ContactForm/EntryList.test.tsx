import { render, screen } from '@testing-library/react'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { Phone } from '@linagora/twake-icons'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'
import { EntryList } from './EntryList'

const mockUseBreakpoints = jest.fn(() => ({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isExtraLarge: false
}))

jest.mock('@linagora/twake-mui', () => {
  const actual = jest.requireActual('@linagora/twake-mui')
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
        onChange={jest.fn()}
        onRemove={jest.fn()}
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
          onChange={jest.fn()}
          onRemove={jest.fn()}
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
})
