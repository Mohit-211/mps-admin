# Note for the admin-panel Claude: directory discovery with Perplexity (Phase 22, 2026-10-13)

Paste this into the admin frontend session (admin.mypageseo.com). Shapes: the backend repo's `docs/API.md` "Directory discovery (Phase 22, admin)"; routes: `docs/ENDPOINTS.md` #228–#231.

---

**What's new:** the citation team can ask Perplexity (a web-searching AI) for more directories, to grow the master list and to find local and industry directories for a customer.

Mohit's rule: **nothing is added automatically.** Every suggestion lands in a review list; an admin accepts it (it becomes a normal directory) or dismisses it. Live after the next deploy, once Mohit sets `PERPLEXITY_API_KEY` on the server. Until then, discover answers **503** `perplexity_not_configured`; show "Directory discovery isn't set up yet".

**Permissions:** listing needs `citations.view`. Discover, accept and dismiss need `citations.manage`.

## 0. Change (2026-10-13): discovery runs in the background, so poll it

The first live search failed with a CORS error. A Perplexity search can take more than a minute, and Cloudflare cuts requests at about 100 seconds. It then answers with its own error page, which has no CORS header. The backend now runs the search as a background job:
1. **Start:** `POST /admin/citations/directory-suggestions/discover` (same body) answers **202** at once: `{ run_id, status: "queued", created: [] }`. Validation, key and budget errors still answer at once.
2. **Poll:** `GET /admin/citations/directory-suggestions/discover/:runId` every 3–5 seconds while `status` is `queued` or `running`. Show "Searching the web… this can take a minute or two", and let the admin close the dialog: the search keeps running. If they do, show a small "Search running" chip they can reopen from the list.
3. **`done`:** show `created` (the new suggestions) and "N new (M skipped)", then refresh the Suggested list.
4. **`failed`:** show `error.message`. `error.code` is `perplexity_failed`, `perplexity_budget_reached`, `perplexity_not_configured` or `timed_out`.

Sections 1–2 below otherwise still apply. Where they describe the old instant answer, read it as the finished run.

## 1. "Discover directories" (a panel on the Directories screen and on a location's citation list)

**Three kinds of search** (`POST /admin/citations/directory-suggestions/discover`):
- **General:** `{ scope: "general", country: "US" | "CA", region?: "ON" }`. National and regional directories for any business; this is how the general list grows past today's ~20.
- **By business category:** `{ scope: "category", country, business_category_id }`. Pick the category from `GET /admin/citations/business-categories?q=`.
- **For a location** (button on the location's citation list): `{ scope: "location", location_id }`. Local directories, the chamber and local listings for its city / region, plus its industry.

**Count:** `count` (5–25, default 15).

**While it runs:** 10–30 seconds; show a progress state ("Searching the web…"). Don't fire twice.

**Answer:** `{ created: [suggestion], skipped_duplicates, sources, cost_usd }`.
- Show "N new suggestions (M skipped: already on the list or suggested before)".
- Then show the review list filtered to this search.
- Domains already on the master list, already suggested, or dismissed are never suggested again, so repeat searches only add new ones.

**Errors:**
- **400** `country_required`, `business_category_required`, `unsupported_country`
- **403** `assigned_locations_only`: an employee limited to assigned locations can only run location searches for their own locations; hide General / Category for them (`/admin/auth/me` → `citation_scope: "assigned"`).
- **503** `perplexity_budget_reached`: "Discovery is paused for today".
- **502** `perplexity_failed`: "Try again".

## 2. Review list ("Suggested directories")

**Load:** `GET /admin/citations/directory-suggestions?status=pending&scope=&country=&location_id=&page=&limit=`. Add tabs for Pending / Accepted / Dismissed.

**Each row:**
- name + domain (links to `url`, opening in a new tab)
- type and countries / regions
- `why`
- a warning badge when `url_check.ok` is false ("Site didn't answer when checked"): review before accepting
- where it came from (`scope`: General / category name / location name and city)
- who searched (`created_by.name`) and when
- `sources` behind a "Sources" toggle

**Accept:**
- Opens a small form prefilled from the suggestion: name, url, type, countries, regions, categories (`category_ids`, pick from `GET /admin/citations/categories`), authority.
- For location-scope suggestions, add a tick box "Also add to this location's list" (`add_to_location`).
- **Call:** `POST …/:suggestionId/accept { …edited fields, add_to_location }` → `{ suggestion, directory, added_to_location }`.
- The new directory then appears in the master list like any other.
- **Errors:**
  - **409** `domain_taken`: someone added it meanwhile; offer Dismiss.
  - **400** `invalid_directory` with `problems[]`: show them per field, the same as the directory form. A niche directory needs a category.

**Dismiss:** `POST …/:suggestionId/dismiss { note? }` (optional reason). A decided suggestion answers **409** `already_decided`; reload the row.

**Bulk:** if you add "Dismiss selected", call dismiss once per row.

## 3. Cost visibility (optional)

Each discover answer has `cost_usd` (usually under $0.01). Showing it isn't required. If you do, show it to super admins only.

## How to report back

One line per section (1–3): OK / changed (what) / question.
