import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import {
  FOCUS_HEADING_STATE,
  useFocusHeadingOnArrival
} from './focusHeadingOnArrival'

const Page: React.FC = () => {
  const headingRef = useFocusHeadingOnArrival<HTMLHeadingElement>()
  return (
    <h1 ref={headingRef} tabIndex={-1}>
      Book
    </h1>
  )
}

const Form: React.FC = () => {
  const navigate = useNavigate()
  return (
    <>
      <button
        onClick={() => void navigate('/book', { state: FOCUS_HEADING_STATE })}
      >
        Save
      </button>
      <button onClick={() => void navigate('/book')}>Back</button>
    </>
  )
}

const renderAt = (path: string): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/book" element={<Page />} />
        <Route path="/form" element={<Form />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('useFocusHeadingOnArrival', () => {
  it('focuses the heading after a navigation asking for it', () => {
    renderAt('/form')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('heading', { name: 'Book' })).toHaveFocus()
  })

  it('leaves the focus alone after a plain navigation', () => {
    renderAt('/form')

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByRole('heading', { name: 'Book' })).not.toHaveFocus()
    expect(document.activeElement).toBe(document.body)
  })
})
