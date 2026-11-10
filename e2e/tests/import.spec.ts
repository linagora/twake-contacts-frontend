import { LoginPage } from '../pages'
import { expect, test } from '../support/fixtures'
import { waitForMail } from '../support/mail'

const VCF =
  'BEGIN:VCARD\r\nVERSION:3.0\r\nUID:qa-imp-1\r\nFN:Imported Alpha\r\nN:Alpha;Imported;;;\r\n' +
  'EMAIL;TYPE=WORK:imported.alpha@example.com\r\nTEL;TYPE=CELL:+33600000001\r\n' +
  'CATEGORIES:Sales,Paris\r\nADR;TYPE=WORK:;Building B;10 Avenue des Champs;Paris;;75008;France\r\n' +
  'ORG:Acme\r\nEND:VCARD\r\n'

const IMPORT_TOAST =
  "Import in progress. You'll receive an email when it's complete."

test.describe('IMP import', () => {
  test('IMP-01 import a vCard file into My contacts', async ({
    page,
    user,
    dav
  }) => {
    await dav.putContact('contacts', {
      firstName: 'Already',
      lastName: 'There'
    })
    const contacts = await new LoginPage(page).loginAs(user)
    await expect(contacts.importButton).toHaveCount(1)

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      contacts.importButton.click()
    ])
    expect(await chooser.element().getAttribute('accept')).toBe('.vcf')
    await chooser.setFiles({
      name: 'import.vcf',
      mimeType: 'text/vcard',
      buffer: Buffer.from(VCF)
    })

    await expect(contacts.toast(IMPORT_TOAST)).toBeVisible()
    await waitForMail(user.email, 'Subject: Contacts import reporting')
    await expect
      .poll(() => dav.contactNames('contacts'))
      .toContain('Imported Alpha')
    await contacts.reload()
    await expect(contacts.row('Imported Alpha')).toBeVisible()
  })

  test('IMP-02 import from the empty state', async ({ page, user, dav }) => {
    const contacts = await new LoginPage(page).loginAs(user)
    await expect(contacts.emptyState).toBeVisible()

    await contacts.importFile('import.vcf', VCF)

    await expect(contacts.toast(IMPORT_TOAST)).toBeVisible()
    await expect
      .poll(() => dav.contactNames('contacts'), { timeout: 60_000 })
      .toEqual(['Imported Alpha'])
    await contacts.reload()
    await expect(contacts.emptyState).toHaveCount(0)
    await expect(contacts.row('Imported Alpha')).toBeVisible()
  })

  test('IMP-03 import into a specific address book', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('qa-book', { firstName: 'Already', lastName: 'There' })
    const contacts = await new LoginPage(page).loginAs(user)
    await contacts.openBook('QA Book')

    await contacts.importFile('import.vcf', VCF)

    await expect(contacts.toast(IMPORT_TOAST)).toBeVisible()
    await expect
      .poll(() => dav.contactNames('qa-book'), { timeout: 60_000 })
      .toContain('Imported Alpha')
    expect(await dav.contactNames('contacts')).toEqual([])
    await contacts.reload()
    await expect(contacts.row('Imported Alpha')).toBeVisible()
    await contacts.openMyContacts()
    await expect(contacts.row('Imported Alpha')).toBeVisible()
  })

  test('IMP-04 an invalid file imports nothing and does not crash', async ({
    page,
    user,
    dav
  }) => {
    await dav.putContact('contacts', {
      firstName: 'Already',
      lastName: 'There'
    })
    const contacts = await new LoginPage(page).loginAs(user)

    await contacts.importFile('import.vcf', 'hello world')

    await expect(
      contacts
        .toast(IMPORT_TOAST)
        .or(contacts.toast('An unknown error occurred'))
    ).toBeVisible()
    await contacts.reload()
    await expect(contacts.rows).toHaveCount(1)
    expect(await dav.contactNames('contacts')).toEqual(['Already There'])
  })
})
