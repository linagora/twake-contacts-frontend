import { render, screen } from '@testing-library/react'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import { ContactAvatar } from './ContactAvatar'

const backgroundOf = (text: string): string =>
  getComputedStyle(screen.getByText(text)).background

describe('ContactAvatar', () => {
  it('shows the initials of the display name', () => {
    render(
      <TwakeMuiThemeProvider>
        <ContactAvatar size="s" displayName="Anna Default" />
      </TwakeMuiThemeProvider>
    )

    expect(screen.getByText('AD')).toBeInTheDocument()
  })

  it('takes its colour from the full display name, like the contact popover', () => {
    // nameToColor('Anna Default') is "moonBlue", nameToColor('AD') is "downy"
    render(
      <TwakeMuiThemeProvider>
        <ContactAvatar size="s" displayName="Anna Default" />
      </TwakeMuiThemeProvider>
    )

    expect(backgroundOf('AD')).toContain('rgb(109, 207, 255)')
  })

  it('renders the initials with the given typography variant', () => {
    render(
      <TwakeMuiThemeProvider>
        <ContactAvatar
          size={94}
          initialsVariant="h2"
          displayName="Maximilian Wolfe"
        />
      </TwakeMuiThemeProvider>
    )

    expect(screen.getByText('MW')).toHaveClass('MuiTypography-h2')
  })

  it('keeps the colour from the display name with a typography variant', () => {
    const { container } = render(
      <TwakeMuiThemeProvider>
        <ContactAvatar
          size={94}
          initialsVariant="h2"
          displayName="Anna Default"
        />
      </TwakeMuiThemeProvider>
    )

    expect(
      getComputedStyle(
        container.querySelector('.MuiAvatar-root') as HTMLElement
      ).background
    ).toContain('rgb(109, 207, 255)')
  })

  it('falls back to the sunrise colour without a display name', () => {
    const { container } = render(
      <TwakeMuiThemeProvider>
        <ContactAvatar size="s" displayName="" />
      </TwakeMuiThemeProvider>
    )

    expect(
      getComputedStyle(
        container.querySelector('.MuiAvatar-root') as HTMLElement
      ).background
    ).toContain('rgb(248, 210, 128)')
  })

  it('shows a people icon without a display name', () => {
    const { container } = render(
      <TwakeMuiThemeProvider>
        <ContactAvatar size="s" displayName="  " />
      </TwakeMuiThemeProvider>
    )

    expect(container.querySelector('.MuiAvatar-root svg')).toBeInTheDocument()
  })
})
