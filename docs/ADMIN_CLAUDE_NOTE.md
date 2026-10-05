# Note for the admin-panel Claude (2026-10-05)

Paste this into the admin frontend session.

---

You're building the MyPageSEO **admin panel** frontend. The backend is done for everything below. Your reference is **`docs/ADMIN_PANEL.md`** in the backend repo (copy it into your project). It lists every admin endpoint by screen, the permissions, the response envelope and the error codes. Details and examples: `docs/API.md`; the full route catalogue: `docs/ENDPOINTS.md`.

**Rules**
1. Sign in with `POST /api/v1/admin/auth/login` and send `Authorization: Bearer <token>`. Build the menu from `GET /admin/auth/me` → `permissions`, never from the role name. A 403 means hide or disable that feature.
2. Responses are `{ success, status, message, data }`. Branch on `data.reason` for errors and show `message`.
3. Build one page at `/reset-password?token=…`. It posts `POST /admin/auth/reset-password` and is used both for forgot-password and for a new employee's set-password link.
4. Don't invent data. If a screen needs something not in ADMIN_PANEL.md (see its "Not available yet" list), stop and ask Mohit to have the backend Claude add it.

**Screens and their endpoints**
- **Login / my account:** `/admin/auth/*`
- **Employees** (super admin): `GET/POST/PATCH /admin/admins`, roles from `GET /admin/roles`.
  - Create a sales rep with `role_id: 8`.
  - "Delete" an employee = `PATCH { is_active: false }` (employees are deactivated, never hard-deleted).
- **Users:** `GET /admin/users` with `type=business|agency` and `role=owner|member|client_user`, so you can build separate Business, Agency and staff tables.
  - Detail: `GET /admin/users/:id`.
  - Create: `POST /admin/users` (a new Business/Agency account, or a staff member of an existing org).
  - Delete: `DELETE /admin/users/:id { reason }`. It answers 409 `owns_organization` while their org is in use; show the list it returns and offer "Suspend organization" instead.
  - Disable / enable / logout / verify actions are also available.
- **Organizations** (Business / Agency tabs): `GET /admin/organizations?type=`. Detail `GET /admin/organizations/:id` includes staff (`members`), locations, billing, tokens, invoices and citations. The billing tab uses `GET /admin/billing/organizations/:id`.
  - **Tokens:** `POST /admin/billing/organizations/:id/tokens { amount, type: grant|adjustment, note }` to add or remove; the ledger is under `…/tokens/ledger`.
  - **Free locations:** `PATCH /admin/organizations/:id/limits { free_locations }`. This **replaces** the whole override object, so merge it with the current `limit_overrides` first.
  - **Subscription:** comp, manual billing or a custom plan (ADMIN_PANEL.md §6.4 and §6.6).
  - Suspend / unsuspend, extend the trial.
  - **Audit tab:** `GET /admin/billing/audit?organization_id=`.
- **Reports:** `GET /admin/reports` (filters: organization, location, type, status, trigger, dates), the detail `GET /admin/reports/:id`, and the PDF `GET /admin/reports/:id/pdf` (fetch it as a blob with the auth header).
- **Overview:** `GET /admin/overview`. **Support:** `/admin/support/tickets*`. **Sales audit:** `/staff/audits*`. **Citations:** `/admin/citations/*`. **Plans, packs and coupons:** `/admin/billing/*`.

**API URL:** live **`https://api.mypageseo.com/api/v1`** (local backend: `http://localhost:5000/api/v1`). Put it in one env variable.

**Local setup:** Your origin must be in the backend's `ACCESSDOMAINS`, and `ADMIN_FRONTEND_URL` should point at your app (default `http://localhost:3001`) so password links land on your reset page. Create the first super admin with `npm run setup:fresh -- --confirm` (or `admin:create-super`) in the backend repo.
