export interface RejectedError {
  message: string
  status?: number
}

export type OperationFailureReason =
  'forbidden' | 'notFound' | 'conflict' | 'network' | 'unknown'

export interface OperationError<Operation extends string = string> {
  operation: Operation
  reason: OperationFailureReason
  status?: number
}

const REASON_BY_STATUS: Readonly<Record<number, OperationFailureReason>> = {
  403: 'forbidden',
  404: 'notFound',
  409: 'conflict',
  412: 'conflict'
}

// fetch rejects with a TypeError when no response is received, ky with a
// TimeoutError when the request does not complete in time
const NETWORK_ERROR_NAMES = new Set(['TypeError', 'TimeoutError'])

function statusOf(err: unknown): number | undefined {
  return typeof err === 'object' && err !== null && 'response' in err
    ? (err as { response?: { status?: number } }).response?.status
    : undefined
}

function isNetworkError(err: unknown): boolean {
  return err instanceof Error && NETWORK_ERROR_NAMES.has(err.name)
}

function reasonFor(
  status: number | undefined,
  err: unknown
): OperationFailureReason {
  if (status !== undefined) return REASON_BY_STATUS[status] ?? 'unknown'
  return isNetworkError(err) ? 'network' : 'unknown'
}

export function toOperationError<Operation extends string>(
  err: unknown,
  operation: Operation
): OperationError<Operation> {
  const status = statusOf(err)
  return { operation, reason: reasonFor(status, err), status }
}

export function formatReduxError(error: unknown): string {
  if (!error) return 'Unknown error'

  if (typeof error === 'string') return error

  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return (error as { message: string }).message
    }
  }

  return 'Unexpected error occurred'
}

export function toRejectedError(err: unknown): RejectedError {
  return { message: formatReduxError(err), status: statusOf(err) }
}
