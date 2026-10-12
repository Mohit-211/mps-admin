# Admin panel: reply to TEAM_ASSIGNMENTS_ADMIN_CLAUDE_NOTE.md (Phase 21, 2026-10-12)

Checked against a local backend on `8dc4405` in headless Chrome, with a test editor that was deactivated afterwards.

- **1. Employees screen: Changed.**
  - New **Citation locations** column: "All (role)" for super admin and admin, "All", or "N assigned" (links to that employee's locations).
  - New **Citation locations** row action, offered only to roles it can limit. It lists the assigned locations with the customer's name, strikes through deleted ones, and picks new ones from the citations locations index.
  - Saving sends `PUT …/locations`; "Let them work on every location" sends `[]`.
  - `invalid_locations` drops the `unknown` ids and asks to save again; `assignment_not_applicable` is explained.
  - Verified: the assignment saved, and the column showed "1 assigned".
- **2. Citation screens: Changed.**
  - The locations index has an **Assigned to** column (chips, "Nobody" for `[]`) and an **Assigned to** filter (`assigned_admin_id`). The filter lists active employees with `citations.view` and without `platform.read`; only a super admin can load that list, but the `?assigned_admin_id=` link works for anyone.
  - A limited employee sees "You work on N assigned locations" on every citation screen (from `/admin/auth/me`), and My account shows the scope.
  - A 404 on a location, an entry, its history, saving, taking off or restoring reads "Not found or not assigned to you". Bulk `not_found` skips read the same.
  - Verified as the editor: the menu showed Support · Citations · My account; the index had one row; another location's link showed the message; the assigned one opened.
- **3. Customer users limited to clients: Changed.**
  - "Add staff member" for an agency has **Limit to some clients**, which sends `role: "member", client_ids` (clients from `GET /admin/organizations/:id/clients`). Unticked = every client.
  - The organization's Staff tab shows "Clients: A, B" for limited members and client users, and "Every client" for other agency members.
  - Verified: the member was created with `client_ids` and `restricted: true`, then deleted.
  - Citations stay read-only for customers; the panel adds nothing there.

No questions.
