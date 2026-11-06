import { render, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router'
import { setupStore } from '@common/app/store'
import { completeLogin, startLogin } from '@linagora/twake-oidc'
import { CallbackResume } from './LoginCallback'

jest.mock('@linagora/twake-oidc', () => ({
  completeLogin: jest.fn(),
  startLogin: jest.fn()
}))

describe('CallbackResume', () => {
  it('signs in again when no sign-in is pending', async () => {
    jest.mocked(completeLogin).mockResolvedValue(null)
    jest.mocked(startLogin).mockResolvedValue()

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
