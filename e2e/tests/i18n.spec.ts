import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { LoginPage } from '../pages'
import { expect, test } from '../support/fixtures'
import { SideServiceClient } from '../support/sideService'

interface Labels {
  create: string
  myContacts: string
  shared: string
  name: string
  mail: string
}

/** A few labels of the app in a language, read from its dictionary */
function labels(lang: string): Labels {
  const file = join(
    __dirname,
    '..',
    '..',
    'common',
    'src',
    'locales',
    `${lang}.json`
  )
  const { contacts } = JSON.parse(readFileSync(file, 'utf8')) as {
    contacts: {
      create: string
      myContacts: string
      name: string
      tabs: { shared: string }
      menu: { sendMail: string }
    }
  }
  return {
    create: contacts.create,
    myContacts: contacts.myContacts,
    shared: contacts.tabs.shared,
    name: contacts.name,
    mail: contacts.menu.sendMail
  }
}

const ENGLISH = labels('en')

test.describe('I18N languages', () => {
  test('I18N-01 the account language translates the interface', async ({
    page,
    user,
    dav
  }) => {
    await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
    await dav.putContact('qa-book', {
      firstName: 'Jane',
      lastName: 'Doe',
      emails: ['jane.doe@example.com']
    })
    const contacts = await new LoginPage(page).loginAs(user)
    await SideServiceClient.of(page).setLanguage('fr')

    await contacts.reload()

    const main = contacts.main
    await expect(
      contacts.sidebar.getByRole('link', { name: 'Créer' })
    ).toBeVisible()
    await expect(main.getByRole('heading', { level: 4 })).toHaveText(
      'Mes contacts'
    )
    await expect(
      main.getByRole('tab', { name: 'Partagé avec moi' })
    ).toBeVisible()
    await expect(main.getByRole('columnheader')).toHaveText([
      // the sorted column also reads its direction to screen readers
      /^Nom/,
      'E-mail',
      'Téléphone',
      'Équipe',
      ''
    ])
    await expect(main.getByRole('button', { name: 'Importer' })).toBeVisible()
    await main
      .getByRole('row')
      .filter({ hasText: 'Jane Doe' })
      .getByRole('cell')
      .nth(1)
      .click()
    await expect(
      main.getByRole('button', { name: 'Envoyer un e-mail' })
    ).toBeVisible()
    // no raw translation key anywhere
    await expect(page.locator('body')).not.toContainText(
      /contacts\.[a-z]+\.[a-zA-Z]+/
    )
  })

  for (const lang of ['fr', 'vi', 'ru', 'es', 'de', 'it']) {
    test(`I18N-02 I18N-03 the interface in ${lang}`, async ({
      page,
      user,
      dav
    }) => {
      const expected = labels(lang)
      await dav.putContact('contacts', { firstName: 'Jane', lastName: 'Doe' })
      const contacts = await new LoginPage(page).loginAs(user)

      await SideServiceClient.of(page).setLanguage(lang)
      await contacts.reload()

      // the language is taken, not replaced by English
      expect(expected.myContacts).not.toBe(ENGLISH.myContacts)
      await expect(
        contacts.sidebar.getByRole('link', { name: expected.create })
      ).toBeVisible()
      await expect(contacts.main.getByRole('heading', { level: 4 })).toHaveText(
        expected.myContacts
      )
      await expect(
        contacts.main.getByRole('tab', { name: expected.shared })
      ).toBeVisible()
      await expect(contacts.main.getByRole('columnheader').first()).toHaveText(
        new RegExp(`^${expected.name}`)
      )
      await expect(page.locator('body')).not.toContainText(
        /contacts\.[a-z]+\.[a-zA-Z]+/
      )
    })
  }
})
