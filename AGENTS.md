- Read docs/ARCHITECTURE.md before changing the store, the listings or the data access
- Dictionary-based data structure mapping address books to their contacts
- Shared addressbooks User ID persisted in the addressbooks dictonary 
- Sidebar selection navigates to /contacts/:addressBookId
- Contact selection navigates to /contacts/:addressBookId/:contactId
- UI built with @linagora/twake-mui components, no local MUI overrides, no sx, no custom styles. Just plain component with standard API and styles. if truly necessary use twake-css classnames
- Client-side routing via React Router
- All user-facing strings must be internationalized from the start: no hardcoded strings, all 7 locales covered (en, fr, vi, ru, es, de, it)
- Enforced by `npm test`: `common/src/locales/locales.test.ts` (same keys, `%{placeholders}` and plural forms in all locales) and `common/src/locales/translationKeys.test.ts` (every `t('…')` key exists in `en.json`, every `en.json` key is used as a string literal). Keys built at runtime or read by libraries go in `common/src/locales/dynamicKeys.ts`
- Icon button must have a tooltip (except obvious ones like close button for a modal)

## Changelog

- Update the root `CHANGELOG.md` in the same change as every code, dependency,
  configuration, or documentation update so the CI changelog check passes.
- Add a concise entry describing the change under `## [Unreleased]` at the top of
  the changelog, creating that section if it does not exist. Follow the existing
  Keep a Changelog format and use the appropriate category, such as `Added`,
  `Changed`, `Fixed`, or `Security`.
- Include the issue or pull request number when it is known; do not invent one.
  Leave published release entries unchanged and do not create a release version
  or date unless explicitly asked.
- Before finishing, verify that `CHANGELOG.md` is included in the diff and that
  its entry accurately describes the completed work.
