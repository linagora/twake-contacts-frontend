import { DuplicateContactGroup } from '../mergeContactsTypes'
import { runQueuedMerges } from './duplicateMergeRunner'

const groups: DuplicateContactGroup[] = Array.from({ length: 7 }, (_, i) => ({
  id: String(i),
  entries: []
}))

describe('runQueuedMerges', () => {
  it('attempts every group even when all workers initially fail', async () => {
    const failures = groups.slice(0, 5).map(group => new Error(group.id))
    const task = vi.fn((group: DuplicateContactGroup) => {
      const failure = failures[Number(group.id)]
      return failure ? Promise.reject(failure) : Promise.resolve()
    })

    const result = runQueuedMerges(groups, 5, task)
    await expect(result).rejects.toMatchObject({ errors: failures })
    expect(task.mock.calls.map(([group]) => group.id)).toEqual(
      groups.map(group => group.id)
    )
    expect(groups).toHaveLength(7)
  })

  it('waits for remaining work before reporting failures', async () => {
    let finish: (() => void) | undefined
    const held = new Promise<void>(resolve => {
      finish = resolve
    })
    const failure = new Error('failed')
    const task = vi.fn(async (group: DuplicateContactGroup) => {
      if (group.id === '0') throw failure
      await held
    })
    let settled = false
    const result = runQueuedMerges(groups, 2, task)
    const rejection = expect(result).rejects.toMatchObject({
      errors: [failure]
    })
    void result.catch(() => {
      settled = true
    })
    await vi.waitFor(() => expect(task).toHaveBeenCalledTimes(3))
    expect(settled).toBe(false)
    finish?.()
    await rejection
    expect(task).toHaveBeenCalledTimes(7)
  })
})
