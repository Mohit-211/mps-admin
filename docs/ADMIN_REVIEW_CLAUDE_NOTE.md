# Note for the admin-panel Claude: full review of everything built so far (2026-10-11)

Paste this into the admin frontend session (admin.mypageseo.com). The backend is complete through Phase 9.1, merged, and about to go live. **Please go through the whole admin panel against this note.** For each area, check that the screen exists, calls the endpoints listed, and behaves the way described here. Fix what you can. Report the rest back to us (format at the end).

This note is a map and a checklist. It does not repeat every response shape:
- **Admin reference:** the backend repo's `docs/ADMIN_PANEL.md`, which lists every admin endpoint by screen with the request fields. It is still current; this note adds what changed since it was written and what to check.
- **Shapes:** `docs/API.md` sections "Platform admin authentication", "Admin panel", "Billing admin", "Support tickets", "Citations (Phase 16)", "Sales audit (Phase 19)" and "Free audit, marketing site (Phase 20)".
- **Route catalogue:** `docs/ENDPOINTS.md`. The auth column `admin (<permission>)` is tested against the code, so it is always right. **If ADMIN_PANEL.md and ENDPOINTS.md disagree, ENDPOINTS.md wins.**
- **Earlier notes this one builds on:** `ADMIN_CLAUDE_NOTE.md` (2026-10-05) and `CITATIONS_ADMIN_CLAUDE_NOTE.md` (2026-10-08). Both are still current.
- Use the backend repo's copies of these docs, not older copies in your project.

The customer app has its own note (`FRONTEND_REVIEW_CLAUDE_NOTE.md`). Read its section 0 if you need to know how the product works for customers, because many admin actions change what customers see.

---

## 0. Rules for every call (please check the API layer first)

| Rule | What to check |
|---|---|
| API URL | Live: `https://api.mypageseo.com/api/v1`. Local backend: `http://localhost:5000/api/v1`. **Keep it in one env variable.** No hard-coded URLs anywhere else. |
| CORS | The admin panel's origin must be in the backend's `ACCESSDOMAINS`. A CORS error means the origin is missing there, not that the endpoint is broken. Tell Mohit the exact origin(s) you deploy to. |
| Auth | `POST /admin/auth/login` → `{ admin, token }`, valid **12 h**. Send `Authorization: Bearer <token>` on every call. **There is no refresh token for admins:** on any 401, clear the token and go to login, keeping the page the admin was on so they come back to it. |
| Separate tokens | An admin token never works on customer routes, and a customer token never works here. Don't reuse customer-app auth code that calls `/auth/refresh`. |
| Menu | Build the menu from `GET /admin/auth/me` → `permissions`, **never from the role name**. Hide or disable every write button whose permission is missing. A **403** `{ reason: "forbidden", permission }` means the same: hide it. |
| Envelope | Every response is `{ success, status, message, data }`. Errors carry `data.reason`. **Branch on `reason`, show `message`.** |
| Lists | `page` (from 1) and `limit` (1–100, default 20) → `{ <items>, page, limit, total }`. The employees list is the exception: unpaginated, filter it in the browser. |
| Files | PDFs and CSV exports need the auth header, so fetch them as a blob and download from that. A plain `<a href>` gets a 401. |
| Dates | ISO 8601 UTC from the API. Show them in the admin's local time, with the timezone when it matters (trials, renewals). |
| Audit | Every write is audit-logged with the admin's name. Ask for a **reason** in the confirm dialog wherever the endpoint needs one (disable, delete, suspend, remove member). |
| Rate limits | 429 `rate_limited` with `retry_after_seconds` (login: 10 tries per 15 min). Show the wait. |
| No invented data | If a screen needs data the API doesn't give, show nothing or "Not available", and list it in your report. Never fake numbers. |

**Roles and permissions:**

| Permission | Roles | Unlocks |
|---|---|---|
| `admins.manage` | super admin | Employees, roles |
| `platform.read` / `platform.write` | super admin, admin | Overview, users, organizations, reports, contact-form messages |
| `billing.read` / `billing.manage` | super admin, admin | Billing, tokens, subscriptions, invoices, plans, packs, coupons, audit log |
| `support.read` / `support.manage` | super admin, admin, editor | Support tickets |
| `citations.view` / `citations.manage` | super admin, admin, editor | Citations |
| `content.manage` | super admin, admin, editor | Blog, blog categories, FAQs, business categories |
| `audits.run` | super admin, admin, sales representative | Sales audit |
| `leads.read` | super admin, admin, sales representative | Free-audit leads |
| `leads.manage` | super admin, admin | Delete a free-audit lead |

Role ids: 1 super admin, 2 admin, 4 editor, 8 sales representative. **Please log in once as each role** (create a test employee per role) and check that each one sees exactly its menu and no dead buttons. A sales representative should see only the sales audit and the leads.

## 1. Login and own account (Phase 10, 13b)

ADMIN_PANEL.md §3.

- **Login:** every failure is the same **400** "Invalid email or password." (wrong password, deactivated, password not set yet). Show one generic message.
- **`/reset-password?token=…` page:** one page on the admin panel's domain (`ADMIN_FRONTEND_URL`). It serves both the forgot-password link and a new employee's set-password link (72 h). It posts `POST /admin/auth/reset-password { token, password, confirm_password }`. Errors: `link_invalid`, `link_expired` (offer "send a new link", i.e. forgot password), `passwords_do_not_match`.
- **Forgot password:** `POST /admin/auth/forgot-password { email }` always answers the same. Show "If the account exists, a link was sent".
- **My account:** `GET /admin/auth/me` (name, role, permissions). Change password: `POST /admin/auth/change-password { current_password, new_password, confirm_password }`. **It returns a new token: replace the stored one**, or the next call is a 401.
- **Logout** is client-side only (drop the token).

Check: the reset page works for both kinds of link; change-password swaps the token; 401 anywhere returns to login.

## 2. Employees (`admins.manage`)

ADMIN_PANEL.md §4.

- **Table:** `GET /admin/admins?active=true|false`. Columns: name, email, role, active, password set, last login.
- **Create:** `POST /admin/admins { name, email, role_id, password?, confirm_password? }`.
  - Without a password, a set-password link is emailed (72 h).
  - With a password, it is set now and no email goes out.
  - Role picker from `GET /admin/roles` (each role lists its permissions; show them so the creator knows what they grant).
  - Errors: 409 `email_taken`, 400 `invalid_role`, `passwords_do_not_match`.
- **Edit:** `PATCH /admin/admins/:adminId { name?, email?, role_id?, is_active? }`.
  - **"Delete" = `{ is_active: false }`.** Employees are never hard-deleted (their name stays on audit entries, ticket replies and citation history). It ends their sessions at once. Restore with `{ is_active: true }`.
  - Errors: 403 `own_role`, `own_account`, `last_super_admin`. Disable those controls on your own row.
- **Row menu:** resend the link (`POST …/:adminId/password-link`), set a password (`POST …/:adminId/password`; 403 `own_account`, use change-password for yourself).

## 3. Overview (`platform.read`)

`GET /admin/overview`: organizations by type and billing state, paying subscriptions, MRR per currency, trials ending in 7 days, token sales and signups (30 days), open tickets.

Check: every tile links to the filtered list behind it (e.g. "Trials ending" → organizations `?state=trialing&trial_ending_days=7`, "Open tickets" → the support queue). MRR is per currency; **never add USD and CAD together**.

## 4. Users: the customers (`platform.read` / `platform.write`)

ADMIN_PANEL.md §5. **Users are customers and their team members. Employees are separate (section 2).**

- **Table:** `GET /admin/users?q=&status=active|disabled|unverified&type=business|agency&role=owner|member|client_user&organization_id=`.
  - Business owners: `?type=business&role=owner`. Agency owners: `?type=agency&role=owner`. Their staff: `role=member`; agency client logins: `role=client_user`.
- **Detail:** `GET /admin/users/:userId`: memberships (link each to its organization), last 10 logins, Google connections.
- **Create:** `POST /admin/users`, two shapes:
  - A new customer: `{ email, name, account_type: business|agency, organization_name, country: US|CA }`. This creates the organization with a trial, exactly as a signup does.
  - A team member of an existing organization: `{ email, name, organization_id, role: member|client_user, client_ids? }`. Pick `client_ids` from `GET /admin/organizations/:organizationId/clients`.
  - The account is created verified, and a "set your password" email links to the **customer app**. `send_email: false` skips it; the user then uses the customer app's Forgot password.
  - Errors: 409 `email_taken`, `already_member`; 404 `organization_not_found`; 400 `agency_only`, `invalid_clients`.
- **Actions** (each needs a reason where shown):
  - Edit: `PATCH /admin/users/:userId { name?, email?, mobile? }`. Ends every session.
  - Disable `{ reason }` / Enable / Sign out everywhere / Resend verification / Mark verified (409 `already_verified`).
  - Remove from one organization: `DELETE /admin/organizations/:organizationId/members/:userId { reason }` (403 `owner_protected`).
  - **Delete:** `DELETE /admin/users/:userId { reason }`. Hard delete; the email can sign up again. **409 `owns_organization`** while the user owns an organization that is in use: show the returned `organizations` list (members, locations, open subscription) and offer **Suspend organization** instead.

## 5. Organizations (`platform.*`, `billing.*`)

ADMIN_PANEL.md §6. This is usually the best main screen: one row per Business or Agency account.

- **Table:** `GET /admin/organizations?q=&type=business|agency&state=&plan=standard|custom&trial_ending_days=`. Business and Agency tabs.
  - `state`: `trialing | active | past_due | inactive | suspended_by_admin`. Give each a coloured badge.
  - Row: plan, state, trial end, locations `{ used, allowed, free, max }`, users `{ used, limit }`, token balance.
- **Detail:** `GET /admin/organizations/:organizationId` (organization with `limit_overrides`, members, locations, client count, billing, last 10 invoices, citation counts) and `GET /admin/billing/organizations/:organizationId` for the billing tab.
  - Suggested tabs: Overview · Staff · Locations · Tokens · Subscription & limits · Invoices · Reports · Audit.
- **Actions (`platform.write`):**
  - Suspend `{ reason }` / Unsuspend `{ note? }`. A suspended organization keeps reading but its paid actions answer 403 `organization_suspended`. Errors 409 `already_suspended` / `not_suspended`.
  - Trial: `PATCH …/trial { trial_ends_at }`.
  - Limits: `PATCH …/limits { max_locations?, extra_users?, free_locations? }`. **This replaces the whole override object.** Read `organization.limit_overrides` first, merge your change and send every field. `{}` clears all overrides. Please check this one carefully; it's the easiest place to lose data.
- **Letting a customer add locations without paying** (lightest first):
  1. `free_locations` in limits: extra locations that are never billed.
  2. A comped subscription: switch to manual billing, then a manual subscription with `comp_until`.
  3. A custom (enterprise) plan with its own prices and caps.
  Explain these three in the UI (a short help text), so admins pick the lightest one.
- **Tokens (`billing.manage`):** `POST /admin/billing/organizations/:id/tokens { amount, type: grant|adjustment, note }`. A grant must be positive; a negative adjustment that would go below zero is 409 `insufficient_tokens`. Ledger: `GET …/tokens/ledger` (types `purchase | spend | refund | grant | monthly_grant | adjustment | expiry`; `location_id` shows which location spent them).
- **Reports tab:** `GET /admin/reports?organization_id=` (section 7).
- **Audit tab:** `GET /admin/billing/audit?organization_id=` (billing and admin-panel actions with the admin's name).
- **Not available:** deleting a whole organization with its data, logging in as the customer, and viewing a location's ranking or GBP pages. Don't build them.

## 6. Billing (`billing.read` / `billing.manage`)

ADMIN_PANEL.md §6.5–6.6; API.md "Billing admin"; ENDPOINTS.md #122–#151.

**What has changed since ADMIN_PANEL.md (please check the plan form):** plans now carry **AI token costs** and the **`gbp_posts` feature**.

**The model**, so the screens explain it right:
- **Price per location:** a first location price plus a lower additional location price, per currency (USD, CAD). Prices are **dated** (`effective_from`) and apply from each organization's next renewal.
- **Cap:** 20 locations on the standard plan; more needs a custom plan.
- **Users:** 3 users per paid location, pooled, owner included.
- **Trial:** 7 days by default, then read-only until the organization subscribes.
- **Tokens:** manual refreshes and AI actions cost tokens. The monthly automatic refresh is free.
- **No tax.** Coupons apply to **token packs only**.

**Screens:**
- **Plans & pricing:**
  - List: `GET /admin/billing/plans`. Detail: `GET …/:planId`.
  - Edit: `PATCH …/:planId` with any of:
    - `name`
    - `entitlements: { <feature>: bool }`. Features: `rank_tracker, grid, map_ranking, gbp_report, citations, reports, white_label, competitors, team, gbp_posts`. Show one switch per feature.
    - `users_per_location`, `max_locations` (custom plans only; `null` = no cap)
    - `trial: { days, locations, users, tokens }`
    - `tokens_per_refresh: { rankings, gbp }`
    - `ai_token_costs: { reply_drafts_per_10, analysis_per_10, appeal, insights, post_draft, post_image }`. **Defaults: 1, 1, 1, 2, 1, 3.** Label them in plain words: "AI reply drafts (per 10 reviews)", "Review analysis (per 10)", "Removal-request draft", "Review insights", "AI post text", "AI post image".
    - `monthly_token_grant` and the token pack discount
  - Add a price: `POST …/:planId/prices { currency, first_location_price, additional_location_price, effective_from }`. 400 `effective_from_in_past`. Show the price history and the future prices separately from the current one.
- **Subscriptions:**
  - List: `GET /admin/billing/subscriptions?status=&billing_method=&organization_id=`. Detail with events and invoices: `GET …/:id`.
  - Edit a manual subscription: `PATCH …/:id { comp_until?, paid_quantity?, note? }` (409 `not_manual` for PayPal).
  - Re-read from PayPal: `POST …/:id/sync` (409 `not_paypal`, 503 `billing_not_configured`).
  - Cancel: `POST …/:id/cancel { reason? }` (409 `not_open`).
  - Billing method: `PATCH /admin/billing/organizations/:id/billing-method { billing_method: paypal|manual }` (409 `subscription_open`).
  - Invoice-billed subscription: `POST …/organizations/:id/manual-subscription { quantity, starts_at?, comp_until?, currency?, note? }`.
  - Custom plan: `POST` / `DELETE …/organizations/:id/custom-plan`. A new custom plan starts with no prices; prompt the admin to add them straight after.
- **Invoices:**
  - List: `GET /admin/billing/invoices?status=&kind=&organization_id=&q=`. Kinds: `subscription, location_slots, token_pack, manual`.
  - PDF: `GET …/:id/pdf`.
  - Record a manual payment: `POST …/:id/payments { note }`. Void: `POST …/:id/void { note }`. Both 409 `invoice_not_open`.
  - Show the `mismatch` flag (PayPal charged a different amount from the invoice).
- **Token packs:** `GET/POST/PATCH /admin/billing/token-packs` (name, tokens, prices per currency, optional expiry, active, order).
- **Coupons:** `GET/POST/PATCH /admin/billing/coupons` (code, percent or fixed, value, pack ids, max redemptions, expiry). 409 `code_taken`; the code can't be edited.
- **Audit log:** `GET /admin/billing/audit?organization_id=&action=` (`action` is an exact match).

**Right after go-live, the first real use of these screens is Mohit setting prices, token packs and token costs.** Until prices exist, customers get 409 `price_not_set` at checkout. Please make sure the "add a price" flow and the plan form are solid. PayPal is not tested live yet, so the sync / cancel buttons can't be tried end to end.

## 7. Reports generated (`platform.read`)

ADMIN_PANEL.md §7.

- **List:** `GET /admin/reports?organization_id=&location_id=&type=&status=&trigger=&from=&to=`.
  - Types: `rank_tracker | gbp_audit | competitor_analysis | citation | reputation | full`. Statuses: `queued | generating | ready | failed | expired | archived`. Trigger: `manual | schedule`.
  - Show `failure_reason` for failed reports; it's the main reason to open this screen.
- **Detail:** `GET /admin/reports/:reportId` returns `document.blocks`, the same blocks the PDF shows. Render them, or reuse the customer app's report viewer if you can.
- **PDF:** `GET …/:reportId/pdf` (409 `not_ready` / `expired` / `file_missing`).
- **Read-only:** admins can't create, email or archive customer reports.

## 8. Support tickets (`support.read` / `support.manage`)

ADMIN_PANEL.md §9.

- **Queue:** `GET /admin/support/tickets?status=&organization_id=&assigned_to=&unassigned=true&q=`. Counts for the tabs: `GET …/counts`.
- **Thread:** `GET …/:ticketId` includes internal notes. **Show internal notes visibly different** (e.g. a yellow background and "Internal, not visible to the customer").
- **Reply:** `POST …/:ticketId/messages { message, internal? }`. The first reply assigns the ticket to you. The customer sees replies as "MyPageSEO team", never the admin's name.
- **Update:** `PATCH …/:ticketId { status?, priority?, assigned_to? }`. Statuses: `open → in_progress → waiting_on_customer → resolved → closed`. A customer reply reopens a resolved ticket; a closed ticket can't be replied to by the customer.
- **No email notifications** for new tickets or replies yet (Phase 15). Admins have to check the queue; a count in the menu helps.

## 9. Citations (`citations.view` / `citations.manage`)

**The citations admin note covers this fully. Please confirm each of its screens:** locations index, one location's list, recording a check (including the 409 `nap_mismatch` choice), bulk, work queue (three tabs), directories with CSV import / export (always dry-run first), categories.

The main things to get right:
- Citations are **manual**. There is no automatic check.
- The server computes `mismatch_fields` and the health score. Don't compare NAP in the browser.
- `notes` is the internal note on the entry; `note` is the comment on one change. Customers see neither, and every change reads "MyPageSEO team" to them.
- "Delete" on a directory is a deactivate. Label it that way.

**After go-live**, the admin team starts here: the starter list has 50 directories with placeholder authority values, and each location needs its list built and checked.

## 10. Sales audit (`audits.run`)

ADMIN_PANEL.md §10; API.md "Sales audit (Phase 19)".

What it's for: a sales rep runs a free audit of any US / CA business **during a meeting**. It uses public Google data only, with no account or GBP connection. Nothing is kept: an audit is deleted on close or after 24 h.

- **Business search:** `GET /staff/audits/places/autocomplete?input=&session=`. Use one `session` token per search and pass it to the start call.
- **Start:** `POST /staff/audits { place_id, session, keyword }`. 400 `unsupported_country`, `no_location`; **429** `daily_limit_reached` (20 per rep per 24 h).
- **Progress:** poll `GET /staff/audits/:id` every 2–3 s until `done` or `failed`. It usually takes a minute or two; show progress, not a spinner alone.
- **Result:**
  - Headline: `summary.area_rank`, "#N across the area". Secondary: `summary.center_rank`, "#M at your business" (`null` = 30+).
  - A 7×7 heatmap within 5 km, **ranks to 30** ("30+" beyond).
  - **"Who ranks higher" is an area ranking** (`result.basis: "area"`): up to 10 businesses with a better average rank over the 49 points, then the business's own row (`is_self`). Each row has `avg_rank` and `top3_rate`.
  - The quick score with its checklist, the area's top 3 compared, and up to 5 actions.
  - Show the `attribution` ("Google Maps") under business names.
- **PDF:** `GET /staff/audits/:id/pdf` (409 `audit_not_ready`). **Close:** `DELETE /staff/audits/:id`. **Open audits after a reload:** `GET /staff/audits`.
- **Not supported:** history, saved audits, miles.

## 11. Free-audit leads (`leads.read` / `leads.manage`)

ADMIN_PANEL.md §10a.

What it is: the free audit on mypageseo.com is a lead magnet. A visitor sees a preview, fills in a lead form, confirms a 6-digit email code, then gets the full report. Every audit lands here with its lead. Unverified audits disappear after 7 days; verified ones are kept 2 years.

- **Table:** `GET /admin/leads/audits?from=&to=&verified=true|false&q=`. Default filter: verified. Columns: date, person, business, email, phone, verified (✓ / pending / no form), keyword, centre (the city label or "business address"), rank at centre (`null` = 30+), quick score.
- **Export:** `GET /admin/leads/audits/export` with the same filters, as CSV (blob download).
- **Detail:** `GET /admin/leads/audits/:id`: the lead with its consent time and text version, plus the full audit. **Reuse the sales-audit result components**; it's the same shape.
- **PDF:** `GET …/:id/pdf` (409 `audit_not_ready` unless verified and done).
- **Delete** (`leads.manage` only): `DELETE …/:id`. For privacy requests. Confirm first; it's audit-logged.

## 12. Content and contact form (legacy routes, kept)

These are old routes, guarded since Phase 10 and kept by decision. They are **not** rebuilt, so their shapes are the old ones (ENDPOINTS.md lists them).

- **`content.manage`:** blog (`POST/PUT/DELETE /blog`), blog categories (`/blog-category`), FAQs (`/faqs`), and business categories (`POST/PUT /business-categories`). Public reads are on the same paths.
- **`platform.read` / `platform.write`:** contact-form messages: `GET /contact-us/get`, `GET /contact-us/:contactId`, `PUT /contact-us/:contactId/status`, `DELETE /contact-us/:contactId`.

Check: whether the admin panel has these screens at all. If it does, check they use the admin token. If it doesn't, say so in your report; Mohit will decide whether they're needed.

## 13. Built but not live yet (don't treat these as admin-panel bugs)

| Item | Today | Effect in the admin panel |
|---|---|---|
| Prices, packs, token costs | Not set | Mohit sets them in section 6 after go-live. |
| PayPal | No sandbox or live test yet | Subscription sync / cancel can't be tried end to end. |
| OpenAI | No key on the server yet | AI token costs can be set, but customers' AI buttons answer 503 until the key is added. |
| Email | Production uses SMTP (`EMAIL_TRANSPORT=smtp`); locally emails are only logged | Locally, set-password and reset links appear in the backend log. |
| Notifications (new tickets, approvals) | Phase 15 | No notification UI. |
| Citations directory list | 50 starter directories with placeholder authority | The admin team curates it. |

## 14. Not available (don't build)

Deleting a whole organization with its data, impersonating a customer, an admin view of a location's ranking / GBP pages, per-organization Google API cost (only a CLI exists), editing roles or permissions (they're fixed in code), automatic citation checks, and history for sales audits. If a design needs one of these, list it in your report; nothing should be faked.

---

## Go-live setup (for Mohit and for you)

- **First super admin:** on the fresh server, `npm run setup:fresh -- --confirm` creates indexes, reference data, the standard plan, the 50 starter directories and the first super admin (`admin:create-super`). Create every other employee from section 2.
- **Backend env:** `ADMIN_FRONTEND_URL` = the admin panel's URL (so password links open your reset page), and the admin origin in `ACCESSDOMAINS`.
- **Smoke test after deploy** (please run it and report): log in → me → overview → organizations → one organization's detail and billing tab → employees (create a test editor, check their menu, then deactivate them) → support queue → citations locations index → reports → leads → a sales audit start to finish with its PDF → reset-password page with a real link.

## How to report back

Reply with one line per section (0–14), plus the smoke test:

- **OK:** the panel matches.
- **Changed:** what you fixed, in a short list.
- **Missing in the panel:** a screen or behaviour not built yet. Say whether you will build it.
- **Backend question / gap:** something the design needs that the backend doesn't give, or a response that differs from the docs. Include the endpoint, what you sent, what came back (status + `data.reason`) and what you expected.

Also list any endpoint the panel calls that is **not** in `docs/ENDPOINTS.md` (it would be a removed legacy route, such as `/admin/operations/*` or `/supports`). Mohit will pass your report to the backend Claude.
