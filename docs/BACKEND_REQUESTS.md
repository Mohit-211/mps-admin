# Admin frontend → backend: requests and questions (2026-10-05)

> **Status: all answered.** Backend branch `claude/admin-panel-requests` (`9541490`) shipped 1, 2, 3, 7 and 8; 5 and 6 confirmed. Frontend is wired to all of them. Open: 4, Mohit to set `ADMIN_FRONTEND_URL` on live and fix the `ACCESSDOMAINS` typo (`https://admin.pageseo.com`).

From the admin-panel frontend session, after wiring the **Users** and **Staff** screens to the live API (`https://api.mypageseo.com/api/v1`, backend `master` @ `e674d08`). Everything below was checked against the backend source, not guessed.

## Needed (blocking a feature the admin asked for)

### 1. Set a password when creating a staff member: `POST /admin/admins`

Mohit wants to choose a password for a new employee instead of only emailing a set-password link.

**Today:** `validateCreateAdmin` picks only `name, email, role_id`. `createAdmin` always stores `password: null` and emails the 72 h link.

**Ask:** accept two optional fields:
- `password`: `passwordRule` (8–128 chars, a letter and a digit).
- `confirm_password`: must match, else 400 `passwords_do_not_match`.

When `password` is given:
- hash and store it;
- don't send the link email;
- return `password_set: true, password_link_sent: false`;
- add a note to the audit entry (`admin.create`, e.g. `note: "password set by admin"`).

Without `password`, keep today's behaviour.

**Frontend status:** the Staff form already has a "Set a password now" option. It sends `password` and `confirm_password`. Until this ships, the backend drops them: the account is created with a link and `password_set: false`, and the UI warns the admin. No frontend change is needed once you ship it.

Optional, same idea: `POST /admin/admins/:adminId/password { password, confirm_password }`, so a super admin can set a password for an existing employee. Tell me if you add it and I'll put it in the row menu.

### 2. List an agency's clients, for creating a `client_user`

`POST /admin/users` with `role: "client_user"` takes `client_ids`, but the admin API has no way to list an agency's clients. `GET /admin/organizations/:id` returns only a count (`clients: 3`).

**Ask:** `GET /admin/organizations/:organizationId/clients` → `[{ id, name, locations }]`, or `clients: [{ id, name }]` in the organization detail.

**Frontend status:** a client user can be created today, but with no clients assigned, and the form says so.

## Bugs / inconsistencies

### 3. `GET /admin/users?organization_id=` shows the wrong organization on rows

`primaryOrgs()` ignores the `organization_id` filter. For a user who owns org A and is a member of org B, filtering by B returns a row whose `organization` is A, with role `owner`. The "team of this organization" view then shows the wrong role.

**Ask:** when `organization_id` is set, fill `organization` (and its `role`) from the membership in that organization.

## Please confirm

### 4. `ADMIN_FRONTEND_URL` on the live server

Staff set-password and reset links go to `ADMIN_FRONTEND_URL/reset-password?token=…`. What is it set to on live? The admin app is being tested at `http://localhost:3000`, so links pointing at the production admin domain won't work until that is deployed. Is `https://admin.mypageseo.com` final, and has it been added to `ACCESSDOMAINS`?

### 5. Customers created with `send_email: false`

The account gets a random password hash. Please confirm that the customer app's normal "Forgot password" flow works for these accounts (status `ACCEPTED`, verified). The UI tells admins that this is how such a user gets in.

### 6. `GET /admin/admins` has no pagination or search

The frontend loads the whole list and filters it client-side, which is fine for an internal team. Confirm this is intended (no `page/limit/q` planned).

## Nice to have (UI is ready to add them)

7. **Remove a user from one organization without deleting the account:** `DELETE /admin/organizations/:id/members/:userId { reason }`. Today the only option is deleting the whole user, which is wrong for someone who belongs to several organizations.
8. **Edit a customer's name / email** (already in ADMIN_PANEL.md §12 "Not available yet"). Admins will ask for it from the user detail page.
