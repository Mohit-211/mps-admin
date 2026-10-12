# Note for the admin-panel Claude: staff assigned to locations (Phase 21, 2026-10-12)

Paste this into the admin frontend session (admin.mypageseo.com). Shapes: the backend repo's `docs/API.md` "Staff assigned to locations (Phase 21)"; screens: `docs/ADMIN_PANEL.md` §4 and §11. Also an addition for the customer users screen (section 3).

---

**What's new:** the super admin can now give a MyPageSEO employee the customer locations they work on in citations. For that employee it is a **hard limit**: every citation screen (locations index, a location's list, entries, history, the three queues, bulk) covers only those locations. Anything else answers 404, exactly like a missing record. Directories and categories are shared and unaffected.

Who it applies to:
- An employee with **no** locations assigned sees every location, as before.
- Super admin and admin (they have `platform.read`) **always** see everything; assigning to them is refused.
- In practice it applies to **editors**.

## 1. Employees screen (`admins.manage`, super admin)

- **Table:** each employee now has `citation_scope` (`all` / `assigned`) and `assigned_locations` (a count). Add a column such as "Citation locations: All" or "12 assigned".
- **"Assigned locations" tab or panel** on an employee:
  - **Load:** `GET /admin/admins/:adminId/locations` → `{ applies, citation_scope, locations: [{ id, name, city, organization: { id, name }, deleted }] }`.
  - If `applies` is false, show "This role sees every location" and no editor.
  - **Pick locations** with the citations locations index as the picker: `GET /admin/citations/locations?q=&organization_id=&client_id=&country=` (search, then tick). Show `organization.name` with each one, since names repeat across customers.
  - **Save:** `PUT /admin/admins/:adminId/locations { location_ids: [...] }` replaces the list; `[]` = every location again. Errors:
    - 400 `assignment_not_applicable`
    - 400 `invalid_locations` with `unknown: [ids]` (deleted meanwhile; drop them and retry)
  - Show `deleted: true` rows struck through ("deleted by the customer").
  - It's audit-logged as `admin.assign_locations` (visible in the audit log).

## 2. Citation screens

- **For everyone:** the locations index rows carry `assigned_staff: [{ id, name }]`. Show it as a small "Ravi" chip, and add an "Assigned to" filter (`?assigned_admin_id=`), so the super admin can see coverage and gaps (rows with `[]`).
- **For a limited employee:** read `GET /admin/auth/me` → `citation_scope: "assigned"`, `assigned_locations`.
  - Show a banner on the citation screens, such as "You work on 12 assigned locations".
  - The lists are already filtered by the backend.
  - A 404 on a location or entry means it isn't theirs (e.g. an old link): show "Not found or not assigned to you".
  - Bulk results may list `skipped: [{ reason: "not_found" }]` for entries outside their locations.

## 3. Customer users: employees limited to clients (customer side, also new)

Agencies can now limit their own employees (`member`) to clients. From the admin panel:
- **Create one:** `POST /admin/users { email, name, organization_id, role: "member", client_ids: [...] }`. Pick the clients from `GET /admin/organizations/:organizationId/clients`; without `client_ids` the member works on every client.
- **Show it:** on the organization's members list, show "Clients: A, B" for such a member.
- **Citations:** customers, these members included, still only read citations.

## How to report back

One line each for sections 1–3: OK / changed (what) / question.
