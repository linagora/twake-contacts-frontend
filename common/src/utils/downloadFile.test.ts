/**
 * @jest-environment jsdom
 */
import { downloadFile, toFileName } from './downloadFile'

describe('downloadFile', () => {
  it('clicks a link to the blob under the file name, then releases it', () => {
    const blob = new Blob(['BEGIN:VCARD'], { type: 'text/vcard' })
    const createObjectURL = jest.fn(() => 'blob:vcf')
    const revokeObjectURL = jest.fn()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.href).toBe('blob:vcf')
        expect(this.download).toBe('Team.vcf')
      })

    downloadFile(blob, 'Team.vcf')

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:vcf')
    expect(document.querySelector('a')).toBeNull()
    click.mockRestore()
  })
})

describe('toFileName', () => {
  it('keeps a plain name', () => {
    expect(toFileName('Jane Doe', 'vcf')).toBe('Jane Doe.vcf')
  })

  it('replaces the characters file systems reject', () => {
    expect(toFileName('R&D / Sales: "EU"', 'vcf')).toBe('R&D _ Sales_ _EU_.vcf')
  })

  it('falls back to a default name when nothing is left', () => {
    expect(toFileName('  ', 'vcf')).toBe('contacts.vcf')
  })
})
