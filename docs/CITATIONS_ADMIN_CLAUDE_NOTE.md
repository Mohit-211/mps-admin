# Note for the admin-panel Claude: citations (2026-10-08)

Paste this into the admin frontend session. It covers the **Citations** area of the admin panel. The general rules (login, envelope, permissions menu) are in `docs/ADMIN_CLAUDE_NOTE.md` and `docs/ADMIN_PANEL.md`; request and response examples are in `docs/API.md` "Citations (Phase 16)".

---

The backend for citations is complete. Citations are **manual**: there is no citation API and no automatic checking. Your screens are the tools the MyPageSEO team uses to keep a master list of directories, decide which directories each customer location should be on, and record what they find on each one. Everything you save shows up read-only for the customer (their citation page, dashboard and Citation Report).

**Permissions.** `citations.view` lets an admin read; `citations.manage` lets them change. Super admin, admin and editor have both. Show the Citations menu when `GET /admin/auth/me` → `permissions` has `citations.view`, and hide every write button without `citations.manage`.

## Screens

### 1. Locations (the starting point), new 2026-10-08
`GET /admin/citations/locations?q=&organization_id=&client_id=&country=US|CA&list=has|none&sort=name|score|checked&page=&limit=`
- One table of every customer location: name, city, organization, client, Citation Health score + grade, listings, `nap_wrong`, last checked.
- `citations: null` means the location has no list yet. Show a "Build list" action that opens the location (screen 2) and runs suggest.
- Useful presets: "No list yet" (`list=none`), "Lowest score" (`sort=score`), "Not checked for longest" (`sort=checked`).

### 2. One location's citation list
`GET /admin/citations/locations/:locationId`
- **Header:** the location, its organization and client, and **`nap`**, what every listing *should* show (name, address, phone, website). Show it prominently: admins compare listings against it.
- **Health box:** `health.score`, `grade`, `coverage`, `counts`.
- **Table of `entries`:** directory (name, link, type, authority), status, listing URL, NAP found, `mismatch_fields` (highlight them), last checked, notes.
- **`removed_from_list`:** directories taken off this location. Show them collapsed, each with "Restore".
- **`category_matched: false`:** show a hint: "No directory category matches this business. Only general directories are suggested. Map its category under Categories."
- **Actions:**
  - **Suggest directories:** `POST …/suggest?dry_run=true` to preview, then without `dry_run` to add. It only adds, as `not_checked`, and never re-adds one an admin took off.
  - **Add directories by hand:** `POST …/entries { directory_ids }` (pick from the directory list).

### 3. Record a check (entry drawer or modal)
`PATCH /admin/citations/entries/:entryId { status?, listing_url?, nap_found?: { name, address, phone, website }, notes?, note?, checked?, confirm? }`
- **Statuses:** `not_checked`, `live_correct`, `nap_wrong`, `not_found`, `duplicate`, `submitted`, `pending`, `removed` (the listing was taken down on purpose).
- The server works out `mismatch_fields`. Don't compare NAP in the browser.
- **409 `nap_mismatch`** on `live_correct`: the NAP you entered differs from the location's. Show the fields and offer "Save as NAP wrong" or "Save anyway" (`confirm: true`).
- **"Checked, no change":** `{ checked: true }`. It updates `last_checked_at` only.
- **`notes`** is the internal note on the entry (customers never see it). **`note`** is a comment on this change in the history.
- **History tab:** `GET …/entries/:entryId/history` (who, when, from → to, fields, note).
- **Take off list:** `DELETE …/entries/:entryId { note? }`. **Restore:** `POST …/entries/:entryId/restore`.
- **Bulk** (select rows): `POST /admin/citations/entries/bulk { entry_ids (≤ 200), status, note? }` → `{ updated, unchanged, skipped }`. Show the skipped ones (`nap_mismatch` when setting `live_correct`).

### 4. Work queue (three tabs)
- **Unchecked:** `GET /admin/citations/queue/unchecked`, locations whose entries are still `not_checked`, waiting longest first.
- **Stale:** `GET /admin/citations/queue/stale?days=90`, entries not checked again for N days.
- **Recent changes:** `GET /admin/citations/queue/recent?days=7`.
- Filters on all three: organization, client, directory, directory type; `status` on stale and recent. Every row links to its location (screen 2).

### 5. Directories (master list)
- **List:** `GET /admin/citations/directories?q=&type=&country=&category_id=&active=`. **Detail:** `GET …/:directoryId` (incl. `used_by_locations`).
- **Create / edit:** `POST` / `PATCH` with `{ name, url, type, countries, category_ids?, regions?, authority?, notes?, is_active? }`.
  - **Types:** `general | niche | aggregator | social | government_chamber`. A `niche` directory needs a category.
  - **`regions`:** 2-letter state / province codes. Leave empty for the whole country.
  - **Errors:** 400 `invalid_directory` (`problems[]`, show them per field); 409 `domain_taken`.
- **Delete** = deactivate: it's no longer suggested, and existing entries keep it. Label the button "Deactivate".
- **CSV:** export `GET …/directories/export` (download it as a blob with the auth header); import `POST …/directories/import?dry_run=true` with the file as the body and `Content-Type: text/csv`. Always dry-run first and show `created / updated / unchanged / errors[{ row, field, message }]`. 422 means nothing was applied. Import is all-or-nothing and upserts by domain.

### 6. Categories
`GET/POST/PATCH/DELETE /admin/citations/categories`. A directory category is an industry group (e.g. "Home services") mapped to Google business categories; pick those with `GET /admin/citations/business-categories?q=`. Deleting a category in use → 409 `in_use` (offer "Deactivate").

## What the customer sees (so you know the effect of each save)
- **Citation Health score** (0–100, grades A–F). It updates on every save. Statuses score `live_correct` 1, `nap_wrong` 0.4, `duplicate` / `submitted` / `pending` 0.3, `not_found` 0. Aggregators weigh most, and directory authority adds weight. `not_checked` lowers coverage instead of the score. `removed` and entries taken off the list don't count.
- The customer's table, NAP issues (found vs expected) and change history. Every change reads **"MyPageSEO team"**: admin names and internal `notes` are never shown.
- Dashboard actions "N listings show the wrong NAP" / "Not listed on N directories", and the Citation Report (PDF, email, schedules).

## Don't build
Automatic listing checks, citation building or submission, competitor citations, backlinks or authority data. None exist in the backend. If a design needs something not listed here, ask Mohit to have the backend Claude add it.
