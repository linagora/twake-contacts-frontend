# Decisions

Decisions taken on @contacts/common, oldest first. Append only: a decision that changes gets a new entry that replaces the old one and cites it. Entry format: the `twake-decisions` skill of [linagora/twake-guidelines](https://github.com/linagora/twake-guidelines/blob/main/skills/twake-decisions/SKILL.md).

Categories: UX, UI, Product, Architecture, Infra, Tech.

## 2026-11-21, [Architecture] A card id round-trips to the file name the server listed

- Decision: `cardIdOf` strips ".vcf" only when the stem left is not empty and does not end with the verbatim mark "/"; any other file name (`.vcf`, `/.vcf`, `a/.vcf`, `x.VCF`) becomes its id followed by "/". `cardFileName` throws for the empty id, an empty name, "." and "..", so no id ever addresses the book or another card.
- Decided by: agent (session for [#678](https://github.com/linagora/twake-contacts-frontend/issues/678)), to be confirmed by chibenwa
- Why: decoded file names can hold a "/" (href `%2F.vcf`), which collided with the mark, so DELETE reached the address book itself.
- Scope: desktop and mobile, every request that addresses a card (`common/src/api/davPaths.ts`).
