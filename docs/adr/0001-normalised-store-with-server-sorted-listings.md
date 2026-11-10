# 1. Normalised store with server-sorted listings

## Status

Accepted

## Context

A user may have thousands of contacts spread over their own, delegated,
subscribed and domain address books. The views show them sorted, by name or by
email, either for one book or for every book at once ("My contacts"). Loading
every contact to sort them in the browser does not scale, and the same contact
appears in several views.

## Decision

- The store keeps each contact once, in `addressBooks[bookId].contacts`, in no
  particular order.
- Each view reads a `listing` (keyed by `all` or by book id) holding only
  references (`refs`) in display order, loaded page after page with the cursor
  of the server, which does the sorting.
- Pages are append-only. The client sorts nothing it received; it only places a
  contact it created, renamed or moved, with
  `Intl.Collator('en', { sensitivity: 'base' })` mirroring the server order.

## Consequences

- An update of a contact is visible in every view without copying it.
- The client order must stay identical to the server order: changing one
  without the other misplaces locally edited contacts.
- A cursor can expire: the listing restarts once from its first page on HTTP 400.
- Pushed changes reload only the last pages of a listing (see
  [ARCHITECTURE.md](../ARCHITECTURE.md#realtime-sync)).
