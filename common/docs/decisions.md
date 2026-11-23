# Decisions

Decisions taken on @contacts/common, oldest first. Append only: a decision that changes gets a new entry that replaces the old one and cites it. Entry format: the `twake-decisions` skill of [linagora/twake-guidelines](https://github.com/linagora/twake-guidelines/blob/main/skills/twake-decisions/SKILL.md).

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
