# Decisions

Decisions taken on twake-contacts-frontend, oldest first, one log for every package of the repository. From 2026-11-23, a new entry names the packages it covers in its Scope line; the entries before that date stay as written. Append only: a decision that changes gets a new entry that replaces the old one and cites it. Entry format: the `twake-decisions` skill of [linagora/twake-guidelines](https://github.com/linagora/twake-guidelines/blob/main/skills/twake-decisions/SKILL.md).

Categories: UX, UI, Product, Architecture, Infra, Tech.

## 2026-11-21, [UX] A card without FN is named from every N component

- Decision: a card with no usable FN is named from its given and family names; when both are blank, from its other N components in reading order (prefix, given, additional, family, suffix, blank ones skipped), before ORG, NICKNAME, email and the file name.
- Decided by: Benoit Tellier, [issue #680](https://github.com/linagora/twake-contacts-frontend/issues/680)
- Why: a card that holds a name must never be shown under its file name or UUID.
- Scope: desktop and mobile, contact listing, contact page and search.

## 2026-11-21, [Architecture] A repeated property the contact does not show is written back as read

- Decision: an EMAIL, TEL, ADR, SOCIALPROFILE or URL that yields nothing to show (blank, or unreadable) is kept in `passthroughProps` and written back as read on save, so its group stays carried and its X-ABLabel / X-ABADR companion is kept.
- Decided by: agent (PR for [#679](https://github.com/linagora/twake-contacts-frontend/issues/679)), to be confirmed by chibenwa
- Why: a save with the form unchanged must not delete what another CardDAV client wrote; a companion is only dropped when the user deleted the property of its group.
- Scope: both, `normalizeContact` / `denormalizeContact` of @contacts/common.

## 2026-11-21, [Architecture] A card id round-trips to the file name the server listed

- Decision: `cardIdOf` strips ".vcf" only when the stem left is not empty and does not end with the verbatim mark "/"; any other file name (`.vcf`, `/.vcf`, `a/.vcf`, `x.VCF`) becomes its id followed by "/". `cardFileName` throws for the empty id, an empty name, "." and "..", so no id ever addresses the book or another card.
- Decided by: agent (session for [#678](https://github.com/linagora/twake-contacts-frontend/issues/678)), to be confirmed by chibenwa
- Why: decoded file names can hold a "/" (href `%2F.vcf`), which collided with the mark, so DELETE reached the address book itself.
- Scope: desktop and mobile, every request that addresses a card (`common/src/api/davPaths.ts`).

## 2026-11-23, [Architecture] One decisions log at the repo root

- Decision: the repository keeps a single `docs/decisions.md` at its root for every package, and an entry names the packages it covers in its Scope line; packages keep no log of their own.
- Decided by: Crash-- (CTO), following [JF-Cozy's review of linagora/twake-ui#262](https://github.com/linagora/twake-ui/pull/262#discussion_r4663460487)
- Why: a decision often spans packages, and the `twake-decisions` skill looks up `docs/decisions.md` at the root.
- Scope: the whole repository, every package.

## 2026-11-24, [Infra] A fork pull request runs no code before a linagora member vouches for its head commit

- Decision: the Jenkinsfile starts with an `Authorize fork` stage: a pull request from a fork runs nothing of its own (build, tests, scripts, post actions) unless the fork owner is a linagora member, or a member approved its head commit, submitted a review "Build this please" on it, or commented "Build this please <sha>" with its full id. No credential is bound at pipeline level; `github` and `dockerHub` are bound only around the steps that use them (`withGithubCredential`, `withDockerHubLogin` with a throwaway Docker config). The block holding these helpers is the same in the Jenkinsfiles of twake-contacts-frontend, twake-calendar-frontend, twake-calendar-side-service, webadmin-proxy, tmail-flutter, esn-sabre, tmail-backend and twake-mail-admin, and is changed in all of them.
- Decided by: Benoit Tellier, after the twake-qa security review of twake-calendar-side-service (SEV-1, 2026-11-23); the pipeline of twake-contacts-frontend is the model.
- Why: the agents are persistent and shared, so code of a pull request that runs before the check can read a credential bound later in the same build, or leave a process behind for a later one. A review is tied to a commit by GitHub, unlike a comment, so a commit pushed after the approval is not built until a member reviews it again.
- Scope: `Jenkinsfile`: the existing check is kept; it now reads the fork owner of a renamed fork (`CHANGE_FORK` as `owner/repository`).

## 2026-11-23, [Architecture] A contact keeps the ETag of its stored vCard

- Decision: the ETag read with a card is stored on the contact without the `-json` suffix esn-sabre adds to its jCard representation, so `If-Match` on save carries the ETag of the stored vCard.
- Decided by: agent (PR [#690](https://github.com/linagora/twake-contacts-frontend/pull/690), esn-sabre 2.5.0.7), to be confirmed by chibenwa
- Why: since esn-sabre 2.5.0.7 (linagora/esn-sabre#854) a jCard GET answers `"<stored>-json"`, while `If-Match` is still evaluated against the stored ETag: every update of a contact read as jCard got HTTP 412.
- Scope: both, `etagOf` of `common/src/features/Contacts/ContactsDao.ts`.

## 2026-11-24, [UI] A hoverable tooltip never sits over another control of its row

- Decision: an interactive (hoverable) tooltip is placed where no other control of its row or of the next row lies; when the control ends the row, the tooltip is anchored beside the whole group of controls (`slotProps.popper.anchorEl`) rather than beside the control. The "More actions" tooltip of a contact row sits left of the row actions, not right of its button. Interactive tooltips are kept: `disableInteractive` is not used.
- Decided by: agent (PR for [#694](https://github.com/linagora/twake-contacts-frontend/issues/694)), to be confirmed by chibenwa
- Why: with no room on its right, Popper flipped the "More actions" tooltip onto the Edit pencil, and a tooltip kept open by the focus returned on Escape caught the pencil's click. Hoverable tooltips are required for accessibility (WCAG 1.4.13).
- Scope: @contacts/private, desktop contact list row actions (`ContactRowActions.tsx`); the sidebar book name tooltip already follows it.

## 2026-11-26, [Product] A merged contact is written into the least shared book of its copies

- Decision: merging duplicates writes the merged card into a book whose audience (its sharees, and everyone when it is published) is within the audience of the book of every other copy; among those books, the most complete copy is kept. A group with no such book (copies in books shared with different users) is not merged, by "Merge" or by "Merge all", and says why. Who can read each book is read from the server (`{DAV:}invite` and ACL) when the merge runs, not taken from the scan.
- Decided by: agent (PR for [#716](https://github.com/linagora/twake-contacts-frontend/issues/716)), to be confirmed by chibenwa
- Why: the most complete copy used to win, so a merge copied the details of a private contact into a book shared or published with others, and a sharee with write rights could plant the richest card to receive them.
- Scope: @contacts/common (`buildMergedContactPlan`, `executeGroupMerge`, `bookAudience.ts`) and the merge page of @contacts/private.
  
## 2026-11-25, [UX] A failed contact search says so, and a new query cancels the previous one

- Decision: when the contact search request fails (network, 5xx, expired session), the search bar shows and announces "Search is unavailable, try again" (`contacts.search.failed`) instead of "No contacts found". Each new query aborts the search request of the previous one, whose answer or failure is then ignored.
- Decided by: agent (PR for [#707](https://github.com/linagora/twake-contacts-frontend/issues/707)), to be confirmed by chibenwa
- Why: a failure shown as an empty result tells the user that contacts they have do not exist, and may lead them to create a duplicate; without cancellation, a late answer to an old query could overwrite the results of the newer one.
- Scope: @contacts/private search bar (`ContactSearchBar.tsx`); @contacts/common `searchContacts` and `useContactSearch` take an optional `AbortSignal`.
