# Admin panel: review report against ADMIN_REVIEW_CLAUDE_NOTE.md (2026-10-11)

From the admin-panel frontend session, for Mohit to pass to the backend Claude. Checked against backend `master` @ `bd7cfec`. Before this pass the panel had only login, users, staff and a dashboard with hard-coded sample numbers. Everything below is now built and wired to the API.

Tested locally: backend on `localhost:5055` with the `mps_rebuild` database, and the panel through the Vite proxy. Every screen was opened in headless Chrome at 1440 px and 390 px. Result: no console errors, no failed API calls, and no horizontal scrolling. I also called every endpoint directly, and each response shape matches the docs.

## Section by section

- **0. Rules: Changed.**
  - The API URL comes from one env variable (`VITE_API_BASE_URL`).
  - Every 401 returns to login and remembers the page the admin was on.
  - The menu is built from `permissions`, and every route is guarded by its permission.
  - PDFs and CSVs download as a blob with the auth header.
  - A 429 shows how long to wait.
  - Trial and renewal dates show the admin's timezone.
  - Every reason-required action asks for a reason.
  - The fake dashboard data is removed.
  - Origins to add to `ACCESSDOMAINS`: `http://localhost:3000` (dev, already there) and the production admin domain once Mohit confirms it.
- **1. Login / own account: Changed.** Added a **My account** page with change password; the new token replaces the stored one. Login, forgot password and the reset page (both link kinds, `link_invalid` / `link_expired` → "request a new link") were already correct.
- **2. Employees: OK.** No changes needed.
- **3. Overview: Changed.** Rebuilt on `GET /admin/overview`. Every tile links to its filtered list, for example trials ending → `/organizations?state=trialing&trial_ending_days=7`. MRR and token sales are shown per currency and never added together.
- **4. Users: Changed.** Each membership and each row's organization now links to the organization page. The `owns_organization` dialog links to the organization.
- **5. Organizations: Built.**
  - List with Business / Agency tabs and the state, plan and trial-ending filters.
  - Detail tabs: Overview · Staff · Locations · Tokens · Subscription & limits · Invoices · Reports · Audit.
  - Actions: suspend / unsuspend, trial end (local timezone shown), tokens grant / adjust with the ledger.
  - Limits: the form starts from the full current `limit_overrides` and sends the merged object (verified: an existing `extra_users` survived a free-locations change). "Clear all" sends `{}`.
  - The three ways to let a customer add locations without paying are explained in the UI.
- **6. Billing: Built.**
  - **Plans & pricing:** the prices in effect now, scheduled prices and history are shown separately. Adding a price sends `effective_from` as 00:00 UTC, warns when it will replace a price on the same date, and handles `effective_from_in_past`. The plan form has every feature switch including `gbp_posts`, all six AI token costs with the plain-word labels and defaults, trial, refresh costs, monthly grant, pack discount and per-pack prices. It sends only the fields that changed.
  - Subscriptions list and detail (edit comp / quantity, sync, cancel), invoices (PDF, record payment, void, `mismatch` flag), token packs, coupons, audit log.
  - Custom plan create / remove, billing method, and starting a manual subscription.
  - A banner warns while the standard plan has no USD or CAD price.
- **7. Reports: Built.** List with all filters and `failure_reason`. The detail page renders `document.blocks`, including `quotes`, which wasn't in the docs. PDF download.
- **8. Support: Built.**
  - Queue with status tabs and counts, unassigned / mine filters and search.
  - Thread with internal notes on a yellow background, labelled "Internal note, not visible to the customer".
  - Reply or internal note. Replying is disabled on a closed ticket; notes still work.
  - Status, priority and assignee controls.
  - The open count shows in the menu (no notifications yet).
- **9. Citations: Built** (every screen in the citations note).
  - Locations index with the three presets.
  - One location's list: NAP shown prominently; mismatches highlighted from `mismatch_fields`, never compared in the browser.
  - Record a check, including the 409 `nap_mismatch` choice (verified). "Checked, no change". History. Take off list / restore.
  - Bulk status, showing the skipped entries.
  - Suggest: always a dry-run preview first.
  - Work queue (three tabs), directories, CSV export / import (dry run first; shows the 422 errors), categories (`in_use` → deactivate).
  - "Delete" on a directory is labelled **Deactivate**.
- **10. Sales audit: Built** (actions added 2026-10-12).
  - Autocomplete with one session token per search.
  - Polls every 2.5 s with a progress display.
  - Shows the area rank as the headline and the centre rank as the secondary number; a 7×7 heatmap to 30; who ranks higher (area basis, own row highlighted); the quick score checklist; the top 3 compared; attribution.
  - PDF, close, and the open audits list for after a reload.
- **11. Leads: Built.** Table (defaults to verified), CSV export with the same filters, detail reusing the sales-audit result view, PDF, and delete (`leads.manage` only, with a confirm).
- **12. Content and contact form: Missing in the panel.** There are no blog, FAQ, business-category or contact-us screens; nothing calls those routes. Not built yet. Mohit to decide if they're needed.
- **13. Not live yet: OK.** No workarounds were built. The PayPal subscription screen shows a note that sync and cancel aren't tested live yet.
- **14. Not available: OK.** None of those features were built.

## Backend questions / gaps

Items 1–4 were done on the backend (`fa10375`). The panel uses them as of 2026-10-12, checked against a local backend on that commit.

1. **Done: audit `actions`.** The panel shows "What to work on first" on the sales audit and the lead detail. `[]` shows "The public profile looks complete"; `null` shows nothing.
2. **Done: `GET /admin/support/assignees`.** The assignee picker uses it, so editors can assign colleagues. A 400 `not_support_staff` refreshes the list and explains why.
3. **Done: `Content-Disposition` is exposed.** Downloads use the server's file name; the panel's own names remain the fallback.
4. **Done: `organization_name`.** Shown on custom plans and on audit entries. An explicit `null` reads "Deleted organization"; a missing field (an older backend) reads "Organization".
5. **Local data, no action needed.** The local standard plan has no `gbp_posts` key in `entitlements`. The panel treats a missing key as on, matching `entitlements[f] !== false`.

## Endpoints the panel calls that aren't in ENDPOINTS.md

None. No legacy routes (`/admin/operations/*`, `/supports`, …) are used.

## Smoke test (local backend, not the live server)

- **Done:** login → me → overview → organizations → one organization's detail and billing tab → support queue → citations locations index → reports (detail + blocks) → leads list.
- **Not done:**
  - Creating a test editor (I didn't add more accounts).
  - A sales audit from start to finish (needs Google Places).
  - The reset page with a real emailed link.
  - The deployed live server.

To run locally I created one super admin in the **local** `mps_rebuild` database with `npm run admin:create-super`: `claude-local-test@mypageseo.test`. It was the only super admin there; the only other account was a sales rep. Remove it, or keep it for local testing.
