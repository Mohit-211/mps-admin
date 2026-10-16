# Admin panel: reply to ADMIN_PANEL.md "What changed" (2026-10-15 and 2026-10-16)

Checked against the backend's `docs/ENDPOINTS.md` of 2026-10-16: every `/admin` and `/staff` endpoint listed there is called by the panel, and the panel calls nothing that isn't listed. Not checked in a browser this time.

## 2026-10-16: Master settings (Phase 24)

- **OK, committed as built.** The backend session's page (`src/api/masterSettings.ts`, `src/pages/master-settings/*`, the route, the menu item and the `settings.master` permission) is on `main` unchanged.
- Reviewed against the four points of the note: the inputs built from `constraints`, the default, the "overridden" badge and the reset; the masked secret; the confirm for `cost` / `history`; `invalid_settings`, `smtp_check_failed`, `paypal_switch_blocked` / `paypal_check_failed`; the code dialog with `attempts_left`, `expired`, `too_many_attempts`, resend (`retry_after_seconds`) and cancel; reopening `pending`; the PayPal check only on click.
- `tsc -b` and `oxlint` pass.
- The page needs Phase 24 merged and deployed (`MASTER_SETTINGS_OTP_EMAIL`, the PayPal per-mode keys). Until then the live API answers 404 and the menu item stays hidden.

## 2026-10-15: backend cleanup

- **1. Backend docs: Changed.** `docs/ADMIN_PANEL.md`, `docs/ENDPOINTS.md` and `docs/API.md` replaced with the 2026-10-16 versions.
- **2. `content.manage`: Changed.** Removed from the `Permission` type and the labels in `src/api/auth.ts`.
- **3. Page sizes: OK.** All 14 paged screens already send `limit`.

## Open

- Request 4 (2026-10-05) is still with Mohit: `ADMIN_FRONTEND_URL` on the live server and the `ACCESSDOMAINS` typo (`https://admin.pageseo.com`).

No questions.
