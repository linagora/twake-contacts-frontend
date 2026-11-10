import { toOperationError, toRejectedError } from './errorUtils'

const httpError = (status: number): Error =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    name: 'HTTPError',
    response: { status }
  })

const namedError = (name: string): Error =>
  Object.assign(new Error('boom'), { name })

describe('toOperationError', () => {
  it.each([
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'conflict'],
    [412, 'conflict'],
    [400, 'unknown'],
    [401, 'unknown'],
    [500, 'unknown'],
    [503, 'unknown']
  ])('classifies HTTP %i as %s', (status, reason) => {
    expect(toOperationError(httpError(status), 'delete')).toEqual({
      operation: 'delete',
      reason,
      status
    })
  })

  it.each(['TypeError', 'TimeoutError'])(
    'classifies a %s without response as a network failure',
    name => {
      expect(toOperationError(namedError(name), 'move')).toEqual({
        operation: 'move',
        reason: 'network',
        status: undefined
      })
    }
  )

  it.each([
    ['a plain error', new Error('Invalid move destination')],
    ['a string', 'boom'],
    ['undefined', undefined]
  ])('classifies %s as unknown', (_, err) => {
    expect(toOperationError(err, 'move')).toEqual({
      operation: 'move',
      reason: 'unknown',
      status: undefined
    })
  })

  it('never carries the raw error message', () => {
    expect(toOperationError(httpError(500), 'delete')).not.toHaveProperty(
      'message'
    )
  })
})

describe('toRejectedError', () => {
  it('keeps the message and the HTTP status', () => {
    expect(toRejectedError(httpError(403))).toEqual({
      message: 'Request failed with status code 403',
      status: 403
    })
  })
})
