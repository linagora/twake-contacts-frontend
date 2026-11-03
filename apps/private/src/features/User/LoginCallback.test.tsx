import { render, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router'
import { setupStore } from '@common/app/store'
import { completeLogin, startLogin } from '@linagora/twake-oidc'
import { CallbackResume } from './LoginCallback'

vi.mock('@linagora/twake-oidc', () => ({
  completeLogin: vi.fn(),
  startLogin: vi.fn()
}))

describe('CallbackResume', () => {
  it('signs in again when no sign-in is pending', async () => {
    vi.mocked(completeLogin).mockResolvedValue(null)
    vi.mocked(startLogin).mockResolvedValue()

    render(
      <Provider store={setupStore()}>
        <MemoryRouter initialEntries={['/callback']}>
          <Routes>
            <Route path="/callback" element={<CallbackResume />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    )

    await waitFor(() => expect(startLogin).toHaveBeenCalledTimes(1))
  })
})
