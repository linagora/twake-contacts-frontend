# Backlog of the e2e suite

One line per case of the QA test plan
(`automation/twake-qa/twake-contacts-frontend/TEST_PLAN.md`), with its identifier. A ticked line
has a spec whose title starts with the identifier (`npx playwright test -g NAV-01`); the spec file
is given after it. A case the plan changes is updated here and in its spec.

Not automated on purpose: what only a person can judge on screen (colours of THEME-03, avatar
centring of VIEW-09, truncation looks of LIST-12 / VIEW-07, NAV-09), and the Domain Address Book
(DAB-*), which the stack does not provide (its PROPFIND answers 404, see the test plan).


## Login and application shell

- [x] AUTH-01 (P1) Login through SSO lands on My contacts — `auth.spec.ts`
- [x] AUTH-02 (P3) Deep link while logged out — `auth.spec.ts`
- [x] AUTH-04 (P3) Error page without an error — `auth.spec.ts`
- [x] AUTH-05 (P2) Reload keeps the user signed in on the same page, tokens not in web storage — `auth.spec.ts` (one step `test.fail`: callback-without-pending-signin-shows-blank-page)
- [x] I18N-01 (P2) French interface — `i18n.spec.ts`
- [x] I18N-02 (P3) Vietnamese and Russian interfaces — `i18n.spec.ts`
- [x] I18N-03 (P2) Spanish, German and Italian interfaces — `i18n.spec.ts`

## Sidebar and navigation

- [x] NAV-01 (P1) Sidebar lists the address books — `navigation.spec.ts`
- [x] NAV-02 (P2) Selecting an address book — `navigation.spec.ts`
- [x] NAV-03 (P2) Create button target follows the selected book — `navigation.spec.ts`
- [ ] NAV-04 (P3) Long address book list scrolls, Create stays fixed
- [x] NAV-05 (P3) Browser back/forward and reload keep the screen — `navigation.spec.ts`
- [x] NAV-06 (P3) Unknown address book shows a not-found state — `navigation.spec.ts`
- [x] NAV-07 (P2) Collapse and expand the books under My contacts — `navigation.spec.ts`
- [x] NAV-08 (P2) Shared books show their owner's name — `navigation.spec.ts`
- [ ] NAV-09 (P3) Long address book names in the sidebar
- [x] NAV-10 (P2) "Shared" section of the sidebar — `navigation.spec.ts`
- [x] NAV-11 (P3) The selected sidebar entry is exposed to assistive technologies — `navigation.spec.ts`
- [ ] NAV-12 (P3) Create keeps the address book of the URL while the books load
- [x] NAV-13 (P3) Address books with an empty or numeric name — `navigation.spec.ts`

## Address books

- [x] ABOOK-01 (P1) Create an address book from the sidebar — `addressbooks.spec.ts`
- [x] ABOOK-02 (P2) New address book dialog validation and cancel — `addressbooks.spec.ts`
- [x] ABOOK-03 (P2) A new address book can be used at once — `addressbooks.spec.ts`
- [x] ABOOK-04 (P3) Two address books with the same name — `addressbooks.spec.ts`
- [x] ABOOK-05 (P3) Several clicks on Create make one address book — `addressbooks.spec.ts`
- [x] ABOOK-06 (P2) Rename an own address book — `addressbooks.spec.ts`
- [x] ABOOK-07 (P1) Delete an own address book and its contacts — `addressbooks.spec.ts`
- [x] ABOOK-08 (P3) The members of a renamed book see its new name — `addressbooks.spec.ts` (`test.fail`: renamed-book-keeps-its-old-name-for-sharees)

## Contact list

- [x] LIST-01 (P1) My contacts merges every address book — `list.spec.ts`
- [x] LIST-02 (P2) Columns of the list — `list.spec.ts`
- [x] LIST-03 (P2) Empty state — `list.spec.ts`
- [x] LIST-04 (P2) Clicking a row opens the contact page — `list.spec.ts`
- [x] LIST-05 (P2) Row actions: hover pencil and More actions menu — `list.spec.ts`
- [x] LIST-06 (P2) More actions menu opens the other apps — `list.spec.ts`
- [x] LIST-07 (P1) Delete a contact from the list — `list.spec.ts`
- [ ] LIST-08 (P2) Contact popover on the name
- [x] LIST-09 (P2) Lazy loading when scrolling — `list.spec.ts`
- [ ] LIST-10 (P3) Deleting before loading more does not skip a contact
- [x] LIST-11 (P3) Row menu email actions are disabled without email — `list.spec.ts`
- [ ] LIST-12 (P3) Long names and emails are truncated with an ellipsis
- [ ] LIST-13 (P2) Dismissing the name popover does not open the hovered contact
- [x] LIST-14 (P2) "My contacts" / "Shared with me" tabs — `list.spec.ts`
- [x] LIST-15 (P3) "Shared with me" tab without shared books — `list.spec.ts`
- [ ] LIST-16 (P3) A contact has the same avatar colour everywhere
- [x] LIST-17 (P2) Created and renamed contacts take their sorted place without reload — `list.spec.ts`
- [ ] LIST-18 (P3) Skeleton rows while more contacts load
- [ ] LIST-19 (P3) Error banner is closable and does not follow the user

## Search

- [x] SEARCH-01 (P1) Search a contact and open it — `search.spec.ts`
- [x] SEARCH-02 (P2) No result and clearing — `search.spec.ts`
- [x] SEARCH-03 (P2) Search across several address books — `search.spec.ts`
- [x] SEARCH-04 (P3) Search finds a contact that is not loaded yet — `search.spec.ts`

## Create contact

- [x] CREATE-01 (P1) Create a contact in My contacts — `create.spec.ts`
- [x] CREATE-02 (P2) Required name and autofocus — `create.spec.ts`
- [x] CREATE-03 (P2) Email validation — `create.spec.ts`
- [x] CREATE-04 (P2) Add and remove fields — `create.spec.ts`
- [x] CREATE-05 (P3) Type labels for phone and address — `create.spec.ts`
- [x] CREATE-06 (P3) Header preview while typing — `create.spec.ts`
- [x] CREATE-07 (P2) Choose the target address book — `create.spec.ts`
- [x] CREATE-08 (P3) Matrix id — `create.spec.ts`
- [x] CREATE-09 (P3) Address book selector sorted like the sidebar — `create.spec.ts`

## Contact page

- [x] VIEW-01 (P1) Contact details — `view.spec.ts`
- [x] VIEW-02 (P2) Copy buttons and toasts — `view.spec.ts`
- [x] VIEW-03 (P2) Send email, Chat and Schedule buttons — `view.spec.ts`
- [x] VIEW-04 (P2) Back button target — `view.spec.ts`
- [x] VIEW-05 (P3) Unknown contact — `view.spec.ts`
- [x] VIEW-06 (P3) Imported structured address and categories — `view.spec.ts`
- [ ] VIEW-07 (P3) Long values on the contact page are truncated with a tooltip
- [x] VIEW-08 (P2) Link to a contact beyond the first loaded page — `view.spec.ts`
- [ ] VIEW-09 (P3) Wide initials stay inside the large avatar

## Edit contact

- [x] EDIT-01 (P1) Edit a contact — `edit.spec.ts`
- [x] EDIT-02 (P3) Edit form constraints — `edit.spec.ts`
- [x] EDIT-03 (P2) Delete from the edit form — `edit.spec.ts`
- [x] EDIT-04 (P3) Editing keeps fields the form does not show — `edit.spec.ts`
- [x] EDIT-05 (P3) Uppercase vCard types are preselected in the edit form — `edit.spec.ts`
- [x] EDIT-06 (P1) Move a contact to another address book — `edit.spec.ts`
- [x] EDIT-07 (P2) Move and edit in one save, between user books — `edit.spec.ts`
- [x] EDIT-08 (P3) Move a contact into a read-write shared book — `edit.spec.ts`
- [x] EDIT-09 (P3) An untyped address stays untyped after an edit — `edit.spec.ts`
- [x] EDIT-10 (P3) Empty phone and address rows of the edit form are untyped — `edit.spec.ts`

## Delete contact

- [x] DEL-01 (P2) Delete from the contact page — `delete.spec.ts`

## Import

- [x] IMP-01 (P1) Import a vCard file into My contacts — `import.spec.ts`
- [x] IMP-02 (P2) Import from the empty state — `import.spec.ts`
- [x] IMP-03 (P2) Import into a specific address book — `import.spec.ts`
- [x] IMP-04 (P3) Import of an invalid file — `import.spec.ts`

## Shared address books

- [x] SHARE-01 (P1) Read-write shared book shows the owner's contacts — `share.spec.ts`
- [x] SHARE-02 (P2) Sharee edits a read-write shared book — `share.spec.ts`
- [x] SHARE-03 (P2) Read-only shared book — `share.spec.ts`
- [x] SHARE-04 (P2) Contact of a read-only shared book cannot be edited — `share.spec.ts`
- [ ] SHARE-05 (P3) Moving a contact out of a read-only shared book
- [x] SHARE-06 (P1) Share an own address book from the sidebar — `share.spec.ts`
- [x] SHARE-07 (P2) Change the role of a member and remove a member — `share.spec.ts`
- [x] SHARE-08 (P2) Share suggestions skip the owner and existing members — `share.spec.ts`
- [ ] SHARE-09 (P2) Share action on books the user does not own
- [x] SHARE-10 (P1) Add a public address book of another user — `share.spec.ts`
- [x] SHARE-11 (P2) Add a shared address book dialog: messages and edge cases — `share.spec.ts`
- [x] SHARE-12 (P2) Rights in an added public address book — `share.spec.ts`

## Domain Address Book

- [ ] DAB-01 (P2) Domain Address Book lists domain members
- [ ] DAB-02 (P2) Domain Address Book is read-only
- [ ] DAB-03 (P3) Search finds domain members

## Theme

- [x] THEME-01 (P2) Toggle dark mode and back — `theme.spec.ts`
- [x] THEME-02 (P2) The chosen theme is kept after a reload — `theme.spec.ts`
- [ ] THEME-03 (P3) Dark mode on every screen

## Loading states

- [ ] LOAD-01 (P3) Skeleton loaders while the contacts load

## Accessibility and consistency

- [ ] UI-01 (P3) Icon buttons have tooltips

## Responsive layout

- [x] RESP-01 (P2) Phone layout of the contact list — `responsive.spec.ts`
- [x] RESP-02 (P2) Phone sidebar drawer — `responsive.spec.ts`
- [ ] RESP-03 (P3) Phone row menu
- [ ] RESP-04 (P3) Phone contact page and form
- [ ] RESP-05 (P3) Tablet widths between the phone and desktop layouts
- [ ] RESP-06 (P3) Unsaved input survives crossing the phone breakpoint
