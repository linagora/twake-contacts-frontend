import { aContact } from '@common/test/builders'
import { editedFields, rebaseContact } from './rebaseContact'

const opened = aContact({
  id: 'c1',
  displayName: 'Alice Roche',
  title: 'CTO',
  emails: [{ type: 'work', value: 'alice@twake.app' }],
  etag: '"v1"'
})

describe('editedFields', () => {
  it('is empty when the form changed nothing', () => {
    expect(editedFields(opened, { ...opened })).toEqual([])
  })

  it('lists the changed, added and removed fields, never the id or the ETag', () => {
    const edited = {
      ...opened,
      id: 'other',
      etag: '"v9"',
      title: undefined,
      note: 'Met at FOSDEM',
      emails: [{ type: 'home', value: 'alice@twake.app' }]
    }

    expect(editedFields(opened, edited).sort()).toEqual([
      'emails',
      'note',
      'title'
    ])
  })
})

describe('rebaseContact', () => {
  const edited = { ...opened, title: 'CEO' }
  const edits = { opened, fields: editedFields(opened, edited) }

  it('applies the edits over the version saved meanwhile, against its ETag (#649)', () => {
    const current = {
      ...opened,
      phones: [{ type: 'cell', value: '+33611223344' }],
      etag: '"v2"'
    }

    expect(rebaseContact(edited, edits, current)).toEqual({
      ...current,
      title: 'CEO'
    })
  })

  it('applies an edit the version saved meanwhile made too', () => {
    const current = { ...opened, title: 'CEO', etag: '"v2"' }

    expect(rebaseContact(edited, edits, current)).toEqual(current)
  })

  it('refuses when the version saved meanwhile changed an edited field', () => {
    const current = { ...opened, title: 'CFO', etag: '"v2"' }

    expect(rebaseContact(edited, edits, current)).toBeUndefined()
  })

  it('refuses when the ETag of the version saved meanwhile is unknown', () => {
    const current = { ...opened, note: 'Met at FOSDEM', etag: undefined }

    expect(rebaseContact(edited, edits, current)).toBeUndefined()
  })

  it('removes a field the form cleared', () => {
    const cleared = { ...opened, title: undefined }
    const current = { ...opened, note: 'Met at FOSDEM', etag: '"v2"' }

    expect(
      rebaseContact(
        cleared,
        { opened, fields: editedFields(opened, cleared) },
        current
      )?.title
    ).toBeUndefined()
  })
})
