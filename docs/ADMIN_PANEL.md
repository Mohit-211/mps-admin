# Admin panel: backend guide

For the Claude session working on the admin panel (`admin/mps-admin`). The panel also hosts the staff dashboard (the sales audit). This one document has three parts:
1. **What changed:** the newest changes first, and what to do about them.
2. **The reference:** the API by screen.
3. **The screen map.**

Request and response shapes are in [API.md](API.md); every endpoint, with its permission, is in [ENDPOINTS.md](ENDPOINTS.md). The live API is `https://api.mypageseo.com/api/v1`. Report back in your repo's `docs/*_REPORT.md` and `docs/BACKEND_REQUESTS.md`, as before. Older dated notes are in [archive/HANDOFFS.md](../archive/HANDOFFS.md).

## What changed

### 2026-10-16: Master settings page (Phase 24, super admin only)

**Built** in `admin/mps-admin` on 2026-10-16 by the backend session, at Mohit's request; uncommitted there for review. The files are `src/api/masterSettings.ts` and `src/pages/master-settings/*`, plus the route, the menu item and the `settings.master` permission. It was checked against a local API: the tabs, the warning badges, the masked password and the pending-change notice render. The tab is in the URL (`?tab=ranking`).

**New screen to build:** **Master settings**, visible only when `GET /admin/auth/me` lists the permission **`settings.master`** (the super admin; no other role has it). Shapes: [API.md "Master settings (Phase 24)"](API.md#master-settings-phase-24); endpoints #244–#250 in ENDPOINTS.md.
1. **Load:** `GET /admin/master-settings` → `sections[]`, each with `settings[]`.
   - **Inputs from `constraints`:** `allowed` → a select; `type: boolean` → a switch; `number` with `min` / `max`; otherwise text.
   - **Show** the default next to each value, an "overridden" badge, and a "Reset to default" action.
   - **Secrets** (the SMTP password) are `{ set }`: show "Set" / "Not set" and a "Change" field; never prefill.
   - **Warnings:** `cost` (changes the Google bill) and `history` (shifts ranking history) need a confirm before saving.
2. **Save:** send only the changed settings: `POST /admin/master-settings/changes { changes: { KEY: value | null } }` (`null` = reset).
   - **202:** open the code dialog. It shows `changes[]` (old → new), "Code sent to `code_sent_to`" and a countdown to `expires_at`.
   - **400 `invalid_settings`:** show `errors[].message` next to each `key`.
   - **400 `smtp_check_failed`:** the SMTP server refused the new settings (`detail`).
   - **409 `paypal_switch_blocked` / `paypal_check_failed`:** list `paypal.checks` (✓ / ✗ with `detail`) and `paypal.blocking`.
3. **Confirm:** `POST …/changes/:changeId/confirm { code }`.
   - **400 `invalid_code`:** show "Wrong code, N tries left" (`attempts_left`).
   - **410 `expired`** or **429 `too_many_attempts`:** "Save again for a new code".
   - **Resend** (`POST …/resend`; **429 `resend_too_soon`** gives `retry_after_seconds`) and **Cancel** (`DELETE …/changes/:changeId`).
   - `GET` returns the `pending` change after a reload, so the dialog can reopen.
4. **PayPal card:** show `paypal.mode` and whether each mode's keys are in `.env` (`paypal.keys`). Add a "Check live / sandbox" button: `POST /admin/master-settings/paypal/check { mode }`. It is a dry run that makes real PayPal calls, so don't call it on page load.

Changes reach every server process within 30 seconds. The audit log shows them as `settings.master.change`, with secrets masked.

### 2026-10-15: Google approved, backend cleanup, fewer docs

**To do:**
1. **Replace your copies of the backend docs.** This file replaces `ADMIN_PANEL.md`. Refresh `ENDPOINTS.md` and `API.md` too. The old doc names are mapped in [PROGRESS.md "Doc names before 2026-10-15"](../PROGRESS.md#doc-names-before-2026-10-15).
2. **`content.manage`:** drop its label (`"content.manage": "Blog & FAQ"` in `src/api/auth.ts`). Keeping it does no harm.
3. **Page sizes:** send `limit` wherever a screen expects a fixed page size.

**The `content.manage` permission is gone** (9b.2, deployed 2026-10-15).
- It guarded only the legacy blog, FAQ and business-category write routes, which are deleted; the marketing site keeps its own backend for its blog.
- `GET /admin/auth/me` and `GET /admin/roles` no longer list it. The editor keeps `citations.view`, `citations.manage`, `support.read` and `support.manage`.
- The contact-form inbox routes are deleted too (`/contact-us*`; the panel never called them).

**Default page sizes follow the docs.** A legacy middleware used to inject `limit=15`; now lists called without `limit` return their documented default:

| Lists | Default `limit` |
|---|---|
| Admin users, organizations, support tickets, reports, billing-admin lists | 20 |
| Free-audit leads | 25 |
| Citation directories, queues, per-location entries, directory suggestions | 50 |

Every list response carries `page`, `limit` and `total`.

**Admin sessions are unchanged.** Customers signed in once more after the deploy, because their refresh tokens are now stored hashed. A customer may mention it to support.

**No API change in 9b.3 and 9b.4** (the modular monolith; the dependency pass with Express 5 and Mongoose 9; both deployed 2026-10-15). The paths, shapes, permissions and error reasons are the same.

**Google: every approval is in** (the OAuth app verification was confirmed 2026-10-15). Customers can connect any Google account, so the Google connections on a user's detail page are real customers' accounts now, not only test users.

**Your open request 4** (2026-10-05) is still with Mohit: `ADMIN_FRONTEND_URL` on the live server, and the `ACCESSDOMAINS` entry `https://admin.pageseo.com` (missing "my"). It is open item 4 in [STATUS.md](../STATUS.md). Until it is fixed, staff password links and the live admin origin may not work.

### Where the product stands (2026-10-15)

- **Built:** everything in the reference below is live. Nothing new for the panel this time; the next phase (14) is server work.
- **The admin team's tasks** (data, not code):
  - replace the placeholder authority values of the 50 seeded citation directories;
  - when Mohit decides them, set the prices, token packs and token costs in the billing admin. Until then, customer checkout answers `price_not_set`.
- **Planned:** notifications (Phase 15). White-label hosting and AI visibility may add admin screens later; their specs are pending.

## Reference: the admin panel API by screen

_Written 2026-10-05 for the Claude session building the admin panel frontend. Every endpoint below is live on `master` (branch `claude/admin-panel-api` for the 2026-10-05 additions) and covered by tests. The full catalogue is [ENDPOINTS.md](ENDPOINTS.md); request/response examples are in [API.md](API.md) ("Platform admin authentication", "Billing admin", "Admin panel", "Support tickets", "Sales audit"). If this file and ENDPOINTS.md disagree, ENDPOINTS.md wins (a test keeps it in sync with the code)._

### 1. Basics

- **Base URL:** live **`https://api.mypageseo.com/api/v1`**; local `http://localhost:5000/api/v1` (`PORT` in `.env`). Every path below is relative to `/api/v1`. Keep it in one env variable in the frontend (e.g. `VITE_API_URL` / `NEXT_PUBLIC_API_URL`).
- **CORS:** the admin frontend origin must be in `ACCESSDOMAINS` (comma-separated) on the backend; on the live server that is the admin panel's domain (`https://admin.mypageseo.com`, to be confirmed by Mohit). A local admin frontend (`http://localhost:3001`) is **not** allowed by the live API unless Mohit adds it.
- **Auth header:** `Authorization: Bearer <admin token>` on every call except login, forgot-password and reset-password. Admin tokens and customer tokens are separate: a customer token never works here, and an admin token never works on customer routes.
- **Envelope** (every JSON response, success or error):
  ```json
  { "success": true, "status": 200, "message": "Completed Successfully.", "data": { … } }
  ```
  Errors use the same envelope with `success: false`. Machine-readable error codes are in **`data.reason`** (e.g. `{ "reason": "owns_organization", "organizations": [...] }`). Show `message` to the admin; branch on `data.reason`.
- **Status codes:** 400 invalid input (`reason: invalid_input`), 401 no/expired token → send to login, 403 `{ reason: "forbidden", permission }` → hide or disable that feature, 404 `not_found`, 409 conflict (state doesn't allow it), 429 `rate_limited` (`retry_after_seconds`).
- **Pagination:** list endpoints take `page` (from 1) and `limit` (1–100, default 20) and return `{ <items>, page, limit, total }`.
- **Audit:** every write is audit-logged with the admin's id and name. Read it with `GET /admin/billing/audit?organization_id=&action=` (entries carry `organization_name` since 2026-10-11) (billing actions `billing.*` and admin-panel actions `admin.user.*`, `admin.organization.*`; `action` is an exact match). Employee changes (`admin.create`, `admin.update`, `admin.password_link`) are listed too (no organization; filter by `action`).
- **IDs** are 24-char Mongo ObjectIds. Dates are ISO 8601 UTC strings.
- **Downloads (2026-10-11):** PDF and CSV routes send `Content-Disposition: attachment; filename="…"`, and CORS now exposes it, so read the file name from that header after fetching the blob.

### 2. Roles and permissions (what to show to whom)

Call `GET /admin/auth/me` after login and drive the menu from its `permissions` array. Never hard-code by role.

| Permission | Roles | Unlocks |
|---|---|---|
| `admins.manage` | super admin | Employees (admin accounts), roles |
| `platform.read` | super admin, admin | Overview, users, organizations, reports (read) |
| `platform.write` | super admin, admin | Create / delete / disable users, suspend orgs, trial, limits, free locations |
| `billing.read` / `billing.manage` | super admin, admin | Billing details, tokens, subscriptions, invoices, plans, packs, coupons |
| `support.read` / `support.manage` | super admin, admin, editor | Support tickets |
| `citations.view` / `citations.manage` | super admin, admin, editor | Citation directories, per-location citation lists, work queue |
| `audits.run` | super admin, admin, sales representative | Sales audit (staff dashboard) |
| `leads.read` | super admin, admin, sales representative | Free-audit leads from the marketing site (list, detail, PDF, CSV) |
| `leads.manage` | super admin, admin | Delete a free-audit lead (privacy requests) |

Role ids: 1 super admin, 2 admin, 4 editor, 8 sales representative (`GET /admin/roles` lists them with their permissions).

**Two kinds of people, two tables:**
- **Employees / staff** = platform admins (the MyPageSEO team: admins, editors, sales reps). Managed under `/admin/admins`.
- **Users** = customers (Business or Agency account holders and *their* team members). Managed under `/admin/users` and `/admin/organizations`.

### 3. Login and own account

| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/admin/auth/login` | `{ email, password }` | `{ admin, token }` (token valid 12 h) |
| GET | `/admin/auth/me` | – | the admin object (not wrapped): `{ id, name, email, role_id, role_name, permissions, is_active, password_set, last_login_at, created_at }` |
| POST | `/admin/auth/change-password` | `{ current_password, new_password, confirm_password }` | `{ changed: true, token }`: replace the stored token |
| POST | `/admin/auth/forgot-password` | `{ email }` | `{ reset: "sent_if_account_exists" }` (always the same) |
| POST | `/admin/auth/reset-password` | `{ token, password, confirm_password }` | done; errors `link_invalid`, `link_expired`, `passwords_do_not_match` |

- Login failures are always **400** "Invalid email or password." (wrong password, deactivated, password not set yet). Show one generic message. 429 after 10 attempts in 15 min.
- The admin frontend needs one page at **`ADMIN_FRONTEND_URL/reset-password?token=…`**: it serves both "forgot password" links and a new employee's "set your password" link. It posts to `/admin/auth/reset-password`.
- No refresh token for admins: on 401, send to login.

### 4. Employees (staff) – `admins.manage`

| Method | Path | Body / query | Notes |
|---|---|---|---|
| GET | `/admin/admins` | `?active=true\|false` | the employees table |
| POST | `/admin/admins` | `{ name, email, role_id, password?, confirm_password? }` | **Create employee.** Without `password`: a set-password link is emailed (72 h). With `password` + `confirm_password` (8–128 chars, a letter and a digit): it is set now and no email goes out (`password_set: true, password_link_sent: false`). For a sales person use `role_id: 8`. 409 `email_taken`, 400 `invalid_role`, `passwords_do_not_match` |
| GET | `/admin/admins/:adminId` | – | one employee |
| PATCH | `/admin/admins/:adminId` | any of `{ name, email, role_id, is_active }` | edit; **`is_active: false` is "delete"** (see below). 403 `own_role`, `own_account`, `last_super_admin` |
| POST | `/admin/admins/:adminId/password-link` | – | resend set-password / reset link |
| POST | `/admin/admins/:adminId/password` | `{ password, confirm_password }` | **Set an employee's password** (row menu). Pending links stop working; their sessions end. 403 `own_account` (your own: change-password) |
| GET | `/admin/roles` | – | role picker: `[{ role_id, key, name, active, permissions }]` |
| GET | `/admin/admins/:adminId/locations` | – | **Phase 21:** the customer locations this employee works on in the citation admin: `{ applies, citation_scope, locations: [{ id, name, city, organization, deleted }] }` |
| PUT | `/admin/admins/:adminId/locations` | `{ location_ids }` (≤ 1000; `[]` = all again) | **Phase 21:** replace the list. 400 `assignment_not_applicable` (super admin / admin always see all), `invalid_locations` (`unknown`) |

**Deleting an employee:** employees are deactivated, not hard-deleted (their name stays on audit entries, ticket replies and citation history). Label the action "Remove" / "Delete" in the UI and call `PATCH { is_active: false }`; it ends their sessions at once and they can't sign in. Show inactive employees under an "Inactive" filter (`?active=false`); `PATCH { is_active: true }` restores one.

**Sales staff** sign in through the same `/admin/auth/login` and only see the sales audit (`audits.run`). Their screens: `/staff/audits/*` (section 10).

### 5. Users (customers)

#### 5.1 Users table – `platform.read`

`GET /admin/users?q=&status=&type=&role=&organization_id=&page=&limit=`

| Filter | Values | Meaning |
|---|---|---|
| `q` | text | email or name contains |
| `status` | `active` \| `disabled` \| `unverified` | account state |
| `type` | `business` \| `agency` | has an active membership in an organization of that type |
| `role` | `owner` \| `member` \| `client_user` | owner = the account holder; member / client_user = their staff |
| `organization_id` | id | members of one organization |

Row: `{ id, email, name, user_type, status, disabled, email_verified_at, created_at, last_login_at, organizations (count), organization: { id, name, type, role } | null }`. With a `type` / `role` / `organization_id` filter, `organization` is the membership that matched (e.g. the agency where they are a member); without one, their first membership, owner first.

The employees list (`GET /admin/admins`) is intentionally unpaginated: it is the internal team, so load it once and filter in the browser.

**The separate tables you asked for:**
- Business users: `?type=business&role=owner`
- Agency users: `?type=agency&role=owner`
- Staff of businesses / agencies: `?type=business&role=member`, `?type=agency&role=member` (agency client logins: `role=client_user`)
- Staff of one customer: `?organization_id=<id>` (or the `members` list of the organization detail, 6.2)

For a customer-centric view (one row per business / agency with plan, state, locations, tokens), use the **organizations table** (6.1): it is usually the better main screen, with users as a drill-down.

#### 5.2 User detail – `platform.read`

`GET /admin/users/:userId` → the row fields plus `mobile`, `memberships: [{ organization_id, organization, type, role, status }]`, `recent_logins: [{ at, logged_out_at, ip }]` (last 10), `google_connections: [{ google_email, status }]`. Link each membership to its organization detail.

#### 5.3 Create user – `platform.write` (new 2026-10-05)

`POST /admin/users`, two shapes:

```jsonc
// A new customer: creates the user + a Business or Agency organization they own (trial starts as at signup)
{ "email": "nia@bakery.com", "name": "Nia", "account_type": "business", "organization_name": "Nia Bakery", "country": "CA" }

// A staff member of an existing business / agency
{ "email": "sam@agency.com", "name": "Sam", "organization_id": "<org id>", "role": "member" }
// agency client login: "role": "client_user", "client_ids": ["<client id>", …]
```

Optional `send_email: false` skips the email; the user then gets in with the customer app's normal **Forgot password** (the account is active and verified). The account is created **verified** with no usable password; the user gets a "set your password" email linking to the customer app (`FRONTEND_URL/reset-password`, 72 h). If the email already has an account and you add it to an existing organization, it just gets the membership (`new_account: false`).

For a `client_user`, pick `client_ids` from `GET /admin/organizations/:organizationId/clients` → `[{ id, name, is_active, locations }]`.

→ **201** `{ user: <user detail>, organization_id, role, new_account, password_email_sent }`. Errors: 409 `email_taken`, `already_member`; 404 `organization_not_found`; 400 `agency_only` (client_user in a business), `invalid_clients`, `invalid_input`. Plan user limits don't apply to admins.

#### 5.4 Actions on a user – `platform.write`

| Action | Call | Notes |
|---|---|---|
| Disable sign-in | `POST /admin/users/:userId/disable { reason }` | ends every session |
| Enable | `POST /admin/users/:userId/enable` | |
| Force logout | `POST /admin/users/:userId/logout` | |
| Resend verification | `POST /admin/users/:userId/resend-verification` | 409 `already_verified` |
| Mark verified | `POST /admin/users/:userId/verify` | 409 `already_verified` |
| **Delete** (new) | `DELETE /admin/users/:userId { reason }` | see below |

| Edit name / email / mobile | `PATCH /admin/users/:userId { name?, email?, mobile? }` | a new email must be free (409 `email_taken`); stays verified; every session ends |
| Remove from one organization | `DELETE /admin/organizations/:organizationId/members/:userId { reason }` | the account stays; 403 `owner_protected` for the owner |

**Delete user** hard-deletes the account (the email can sign up again): Google connections are disconnected (bound locations stay, without GBP), memberships, sessions and profile go, and any organization they own **that is empty** is deleted too. → `{ deleted: true, id, organizations_deleted: [{ id, name }] }`.

It is **refused with 409 `owns_organization`** while the user owns an organization that still has other active members, active locations or an open subscription: `data.organizations: [{ id, name, other_members, locations, open_subscription }]`. Show that list and offer: **Suspend the organization** (6.3) instead, or remove its members / locations / cancel its subscription first. (Deleting a whole organization with its data is not built; ask the backend Claude if you need it.)

A reason is required (min 3 chars): ask for it in the confirm dialog.

### 6. Organizations (Business / Agency accounts)

#### 6.1 Organizations table – `platform.read`

`GET /admin/organizations?q=&type=business|agency&state=&plan=standard|custom&trial_ending_days=&page=&limit=`

- `q`: organization name or owner email; `state`: `trialing | active | past_due | inactive | suspended_by_admin`.
- Row: `{ id, name, type, country, owner_email, plan, state, trial_ends_at, locations: { used, allowed, free, max }, users: { used, limit }, token_balance, suspended_at, created_at }`.
- Two tabs: `?type=business` and `?type=agency`.

#### 6.2 Organization detail – `platform.read`

`GET /admin/organizations/:organizationId` →

```jsonc
{
  "organization": { "id", "name", "type", "country", "created_at", "owner": { "id", "email" }, "suspended_at", "suspended_reason", "limit_overrides": { "max_locations"?, "extra_users"?, "free_locations"? } | null },
  "members": [{ "user_id", "email", "name", "role": "owner|member|client_user", "status", "client_ids", "restricted" }],   // the staff table (Phase 21: restricted = limited to client_ids)
  "locations": [{ "id", "name", "city", "gbp_connected", "source" }],
  "clients": 3,                                   // agency client count
  "billing": { /* = customer GET /billing: state, plan, prices, subscription, next_renewal, locations { active, allowed, free, max }, users, tokens { balance, cost_per_refresh, ai_costs, monthly_grant, … } */ },
  "invoices": [ /* last 10 */ ],
  "citations": { "live_correct": 12, "nap_wrong": 2, … }
}
```

More detail for the billing tab: `GET /admin/billing/organizations/:organizationId` → `{ organization: { …, plan_id, billing_method }, billing, subscriptions (last 10), invoices (last 20), audit (last 20) }`.

Suggested detail tabs: **Overview** (org + billing state) · **Staff** (`members`; add one with 5.3's second shape) · **Locations** · **Tokens** · **Subscription & limits** · **Invoices** · **Reports** (`GET /admin/reports?organization_id=`) · **Audit** (`GET /admin/billing/audit?organization_id=`).

#### 6.3 Organization actions – `platform.write`

| Action | Call | Notes |
|---|---|---|
| Suspend | `POST /admin/organizations/:id/suspend { reason }` | read-only; paid actions answer 403 `organization_suspended`; 409 `already_suspended` |
| Unsuspend | `POST /admin/organizations/:id/unsuspend { note? }` | 409 `not_suspended` |
| Set / extend trial | `PATCH /admin/organizations/:id/trial { trial_ends_at }` | |
| Limits & free locations | `PATCH /admin/organizations/:id/limits { max_locations?, extra_users?, free_locations? }` | see 6.4 |

#### 6.4 "Let this customer add locations without paying"

Three tools, from lightest to heaviest:

1. **Free locations** (new, recommended): `PATCH /admin/organizations/:id/limits { "free_locations": 3 }`. Adds 3 locations on top of what they pay for (or their trial allowance). They can add them at once, no payment prompt, and they are **never billed**: renewals and checkout charge active locations minus free ones. Shows as `locations.free` everywhere. Works while the organization is trialing or subscribed; an organization with no subscription and an ended trial stays read-only (use 2 or extend the trial).
2. **Comped subscription** (a whole account free for a period): `PATCH /admin/billing/organizations/:id/billing-method { billing_method: "manual" }` then `POST /admin/billing/organizations/:id/manual-subscription { quantity, comp_until }`: no invoices until `comp_until`. For an existing manual subscription: `PATCH /admin/billing/subscriptions/:subscriptionId { comp_until, paid_quantity }`.
3. **Custom (enterprise) plan**: own prices, location cap, users per location, monthly token grant, token discounts: `POST /admin/billing/organizations/:id/custom-plan`, then prices with `POST /admin/billing/plans/:planId/prices`. `DELETE …/custom-plan` reverts to standard.

Other limits: `max_locations` (raise the 20-location cap; `null` = no cap), `extra_users` (more logins than 3 per location).
**Important:** `PATCH …/limits` **replaces** the whole override object: send every field you want to keep (read the current `organization.limit_overrides` first and merge). `{}` clears all overrides.

#### 6.5 Tokens – `billing.read` / `billing.manage`

- Balance: `billing.tokens.balance` in the org detail (also `token_balance` in the table).
- **Increase / decrease:** `POST /admin/billing/organizations/:id/tokens { amount, type, note }`
  - give tokens: `{ "amount": 20, "type": "grant", "note": "goodwill" }` (grant must be positive)
  - take tokens away / correct: `{ "amount": -5, "type": "adjustment", "note": "duplicate grant" }`; 409 `insufficient_tokens` if it would go below zero
  - → `{ balance }`
- History: `GET /admin/billing/organizations/:id/tokens/ledger?page=&limit=` → `{ balance, entries: [{ id, type: purchase|spend|refund|grant|monthly_grant|adjustment|expiry, amount, balance_after, ref, location_id, note, by, at }], page, limit, total }`.
- What tokens cost: `billing.tokens.cost_per_refresh { rankings, gbp }` and `ai_costs`. Change them per plan with `PATCH /admin/billing/plans/:planId` (`tokens_per_refresh`, `ai_token_costs`).

#### 6.6 Subscription changes – `billing.manage`

| Need | Call |
|---|---|
| List all subscriptions | `GET /admin/billing/subscriptions?status=&billing_method=&organization_id=` |
| One subscription (with events, invoices) | `GET /admin/billing/subscriptions/:id` |
| Comp until a date / change paid quantity (manual billing) | `PATCH /admin/billing/subscriptions/:id { comp_until?, paid_quantity?, note? }` (409 `not_manual` for PayPal) |
| Re-read from PayPal | `POST /admin/billing/subscriptions/:id/sync` |
| Cancel | `POST /admin/billing/subscriptions/:id/cancel { reason? }` |
| Switch to invoice billing | `PATCH /admin/billing/organizations/:id/billing-method { billing_method: "manual" \| "paypal" }` (409 `subscription_open`) |
| Start an invoice-billed subscription | `POST /admin/billing/organizations/:id/manual-subscription { quantity, starts_at?, comp_until?, currency?, note? }` |
| Custom plan | `POST` / `DELETE /admin/billing/organizations/:id/custom-plan` |

Invoices: `GET /admin/billing/invoices?status=&kind=&organization_id=&q=`, `GET …/:id/pdf`, record a manual payment `POST …/:id/payments { note }`, void `POST …/:id/void { note }`.

Plans carry `organization_name` (the custom plan's organization; `null` for the standard plan) since 2026-10-11. Platform-wide billing settings (a "Plans & pricing" screen): `GET/PATCH /admin/billing/plans[/:planId]`, prices `POST /admin/billing/plans/:planId/prices`, token packs `GET/POST/PATCH /admin/billing/token-packs`, coupons `GET/POST/PATCH /admin/billing/coupons`. Shapes: ENDPOINTS.md #122–#151.

### 7. Reports generated – `platform.read` (new 2026-10-05)

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/reports?organization_id=&location_id=&type=&status=&trigger=&from=&to=&page=&limit=` | every customer's reports, newest first |
| GET | `/admin/reports/:reportId` | status + frozen snapshot + `document.blocks` (same as the customer viewer) |
| GET | `/admin/reports/:reportId/pdf` | the PDF (binary; fetch as a blob with the auth header). 409 `not_ready` / `expired` / `file_missing` |

- `type`: `rank_tracker | gbp_audit | competitor_analysis | citation | reputation | full`
- `status`: `queued | generating | ready | failed | expired | archived`; `trigger`: `manual | schedule`; `from` / `to` filter the creation date.
- Row: `{ report_id, type, sections, status, trigger, schedule_id, location: { location_id, name, deleted }, client, range, run_id, run_at, pdf: { bytes, pages } | null, failure_reason, created_at, generated_at, expires_at, archived_at, organization: { id, name, type } }`.
- Read-only: admins can't create, email or archive customer reports.

### 8. Overview dashboard – `platform.read`

`GET /admin/overview` → organizations by type and state, paying subscriptions, MRR per currency, trials ending in 7 days, token sales and signups (30 days), open tickets. Example in API.md "Admin panel".

### 9. Support tickets – `support.read` / `support.manage`

`GET /admin/support/tickets?status=&organization_id=&assigned_to=&unassigned=true&q=`, `GET …/counts`, the assignee picker `GET /admin/support/assignees` (2026-10-11, `support.read`: active admins with `support.manage`, so editors can assign to colleagues; assigning anyone else is 400 `not_support_staff`), `GET …/:ticketId` (thread incl. internal notes), `POST …/:ticketId/messages { message, internal? }`, `PATCH …/:ticketId { status?, priority?, assigned_to? }`. Statuses `open → in_progress → waiting_on_customer → resolved → closed`.

### 10. Sales audit (staff dashboard) – `audits.run`

Autocomplete `GET /staff/audits/places/autocomplete?input=&session=`, start `POST /staff/audits { place_id, session, keyword }`, poll `GET /staff/audits/:id` every 2–3 s until `done` / `failed`, PDF `GET /staff/audits/:id/pdf`, close `DELETE /staff/audits/:id`, list own `GET /staff/audits`. Full flow and shapes: API.md "Sales audit (Phase 19)". 20 audits per staff member per 24 h (429 `daily_limit_reached`). **Since 2026-10-06 "who ranks higher" is an area ranking** (`result.basis: "area"`): `higher` = up to 10 businesses with a better average rank over the 49 points, then the business's own row (`is_self`); rows add `avg_rank` and `top3_rate`; `competitors` = the area top 3; headline `summary.area_rank` ("#N across the area"), with `summary.center_rank` as the secondary "#M at your business". **`actions`** (2026-10-11): up to 5 "what to work on first" sentences, the same list as the PDF (`[]` = the profile looks complete; `null` until done). The lead detail (10a) carries it too.

### 10a. Free-audit leads (marketing site) – `leads.read` / `leads.manage` (new 2026-10-06)

Every free audit started on mypageseo.com, with the lead's details once they sent the form. A lead is "verified" once they typed the emailed code; only verified leads have the full report and PDF. Unverified audits disappear after 7 days; verified ones are kept 2 years.

- **Table:** `GET /admin/leads/audits?from=&to=&verified=true|false&q=&page=&limit=` → `{ leads, page, limit, total }`.
  - Row: `{ id, created_at, stage, keyword, business: { name, address, rating, user_rating_count }, center: { source: business|city, label }, lead: { business_name, name, email, phone, verified_at } | null, summary: { center_rank, avg_rank, top3_rate } | null, score: { score, grade } | null }`.
  - Suggested columns: date, person, business, email, phone, verified (✓ / pending / no form), keyword, centre (the city label, or "business address"), rank at centre (`null` = 30+), quick score.
  - `q` searches the name, email, phone digits, business and keyword. Default filter: verified.
- **Export:** `GET /admin/leads/audits/export` with the same filters, as a CSV download (fetch it as a blob with the auth header).
- **Detail:** `GET /admin/leads/audits/:id` returns the lead (incl. `consent_at` and `consent_text_version`) and the whole audit.
  - `result` has the same shape as the sales audit: 49 `cells` (heatmap), `summary`, `higher`, `competitors`.
  - It also has `business.score` + `business.checklist`, `api_calls` and `report_emailed_at`.
  - Reuse the sales-audit result components.
- **PDF:** `GET /admin/leads/audits/:id/pdf` (409 `audit_not_ready` unless verified and done).
- **Delete** (`leads.manage` only): `DELETE /admin/leads/audits/:id` → `{ deleted, id }`. For privacy requests; confirm first; it's audit-logged.

Shapes: API.md "Free audit, marketing site (Phase 20)".

### 11. Citations admin – `citations.view` / `citations.manage`

Locations index (2026-10-08, #190), directory master list, categories, CSV import/export, per-location citation lists and the work queue: `/admin/citations/*`, ENDPOINTS.md #82–#104 and #190, API.md "Citations (Phase 16)".

**Staff assignments (Phase 21, 2026-10-12):** an employee with assigned locations (section 4) sees and edits citations of **only** those locations; everything else is a 404 and bulk skips it. Their own `GET /admin/auth/me` → `citation_scope: "assigned"`, `assigned_locations`. The index rows carry `assigned_staff`, and `?assigned_admin_id=` lists one employee's locations. Details: API.md "Staff assigned to locations (Phase 21)".

**Directory discovery (Phase 22, 2026-10-13):** `POST /admin/citations/directory-suggestions/discover` (Perplexity) fills a review list; `GET …/directory-suggestions`, `POST …/:id/accept` (creates the directory, optionally lists it for the location), `POST …/:id/dismiss`. Guide: [archive/HANDOFFS.md, ai assist admin note](../archive/HANDOFFS.md#note-for-the-admin-panel-claude-directory-discovery-with-perplexity-phase-22-2026-10-13).

**Screen-by-screen guide for the admin frontend:** [archive/HANDOFFS.md, citations admin note](../archive/HANDOFFS.md#note-for-the-admin-panel-claude-citations-2026-10-08). Start from the locations index (`GET /admin/citations/locations`): it lists every location, including those without a list (`citations: null`) and those with nothing left unchecked, which the work queue doesn't show.

### 12. Not available yet (don't build UI that needs these)

- Deleting a whole organization with its locations and data (suspend instead).
- Logging in as a customer (impersonation).
- An admin view of a location's ranking / GBP pages (customer routes only); the org detail lists locations, and reports show their data.
- Per-organization Google API cost in the admin API (only the `npm run cost:report` CLI).

Ask the backend Claude (this repo) for any of these; nothing should be faked in the frontend.

## Screen map

### Admin panel (platform admins)

| Screen | Backend | Status |
|---|---|---|
| Overview | `GET /admin/overview` | **available (13b)**: organizations by type and state, paying subscriptions and MRR per currency, trials ending, token sales, signups, open tickets |
| Users | `/admin/users*` | **available (13b)**: search, detail (memberships, logins, Google connections), disable / enable, sign out everywhere, resend verification, mark verified |
| Organizations | `/admin/organizations*`, `/admin/billing/*` | **available (13b)**: list with billing state, detail (members, locations, clients, billing, invoices, citations), suspend, trial, limit overrides; billing actions in the billing admin |
| Support queue | `/admin/support/tickets*` | **available (13b)** |
| Admin accounts | `/admin/admins*`, `GET /admin/roles`, `GET /admin/auth/me`, `POST /admin/auth/change-password` | **available (13b)** |
| Citations, billing | `/admin/citations/*`, `/admin/billing/*` | **available (16, 13a)** |

### Staff dashboard: sales audit (Phase 19)

Platform staff only (an admin session with `audits.run`: the Sales Representative role, super admin, admin). A separate staff login page calling `POST /admin/auth/login`. Shapes: API.md "Sales audit (Phase 19)".

| Screen | Backend | Status |
|---|---|---|
| Staff login | `POST /admin/auth/login`, `GET /admin/auth/me` (`permissions` includes `audits.run`) | **available** |
| New audit (business search + keyword) | `GET /staff/audits/places/autocomplete`, `POST /staff/audits` | **available (19)** |
| Audit result (progress, KPIs, 7×7 heatmap to 30, who ranks higher, quick score + checklist, top-3 comparison) | `GET /staff/audits/:auditId` (poll) | **available (19)** |
| Export PDF (both parts) | `GET /staff/audits/:auditId/pdf` | **available (19)** |
| Close audit | `DELETE /staff/audits/:auditId` | **available (19)** |
| Open audits (after a reload) | `GET /staff/audits` | **available (19)** |
| Audit history, saved audits, miles | – | **not supported** (no history by design; km only for now) |
