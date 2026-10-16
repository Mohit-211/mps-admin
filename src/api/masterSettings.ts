import { api } from "../lib/api";

// Master settings (Phase 24) — docs/ADMIN_PANEL.md "What changed" 2026-10-16, docs/API.md "Master settings".
// Super admin only (permission settings.master). A save is a proposal: the backend emails a 6-digit code to the
// owner's address, and nothing changes until the code is confirmed.

export type SettingSection = "general" | "ai" | "email" | "ranking" | "audits" | "reports" | "security" | "billing";
export type SettingValue = string | number | boolean | null;
export type SettingWarning = "cost" | "history";

export type SettingConstraints = {
  type: "string" | "number" | "boolean" | string;
  /** A fixed list of values: render a select. */
  allowed: (string | number)[] | null;
  min: number | null;
  max: number | null;
  integer: boolean;
};

export type Setting = {
  key: string;
  label: string;
  /** Write-only (the SMTP password): value / default are { set }. */
  secret?: boolean;
  value: SettingValue | { set: boolean };
  default: SettingValue | { set: boolean };
  overridden: boolean;
  constraints: SettingConstraints;
  warnings: SettingWarning[];
};

export type ChangeItem = {
  key: string;
  label: string;
  section: SettingSection | null;
  old: SettingValue;
  new: SettingValue;
  /** Back to the .env default. */
  reset: boolean;
  warnings: SettingWarning[];
};

export type PendingChange = {
  change_id: string;
  status: "pending" | "applied" | "cancelled" | "expired";
  expires_at: string;
  attempts_left: number;
  changes: ChangeItem[];
};

export type PaypalCheck = {
  name: "subscriptions" | "orders" | "keys" | "token" | "product" | "plan_USD" | "plan_CAD";
  ok: boolean;
  detail: string | null;
};

export type PaypalCheckResult = {
  mode: "sandbox" | "live";
  from: "sandbox" | "live";
  ok: boolean;
  checks: PaypalCheck[];
  blocking: { subscriptions: number; orders: number };
};

export type MasterSettings = {
  sections: { section: SettingSection; settings: Setting[] }[];
  paypal: { mode: "sandbox" | "live"; keys: { sandbox: boolean; live: boolean } };
  /** Masked, e.g. m***@mypageseo.com; null when MASTER_SETTINGS_OTP_EMAIL isn't set on the server. */
  code_sent_to: string | null;
  pending: PendingChange | null;
};

export type ProposeResult = PendingChange & {
  code_sent_to: string;
  sent_via: "current_settings" | "new_smtp_settings";
  paypal: PaypalCheckResult | null;
};

export const masterSettingsApi = {
  get: (signal?: AbortSignal) => api<MasterSettings>("/admin/master-settings", { signal }),

  /**
   * Send only what changed; null = back to the .env default. 202 → a code was emailed.
   * 400 unknown_setting / invalid_settings { errors: [{ key, message }] } / no_changes / smtp_check_failed { detail };
   * 409 paypal_switch_blocked / paypal_check_failed { paypal }; 429; 502 code_not_sent; 503 otp_email_not_configured.
   */
  propose: (changes: Record<string, SettingValue>) =>
    api<ProposeResult>("/admin/master-settings/changes", { method: "POST", body: { changes } }),

  /** 400 invalid_code { attempts_left }; 410 expired; 429 too_many_attempts; 404 change_not_found. */
  confirm: (changeId: string, code: string) =>
    api<{ applied: PendingChange; version: number; paypal: PaypalCheckResult | null }>(
      `/admin/master-settings/changes/${changeId}/confirm`,
      { method: "POST", body: { code } },
    ),

  /** 429 resend_too_soon { retry_after_seconds }. */
  resend: (changeId: string) =>
    api<PendingChange & { code_sent_to: string }>(`/admin/master-settings/changes/${changeId}/resend`, {
      method: "POST",
    }),

  cancel: (changeId: string) =>
    api<{ cancelled: true; change_id: string }>(`/admin/master-settings/changes/${changeId}`, { method: "DELETE" }),

  /** Back to the .env defaults, through the same emailed-code flow. */
  reset: (keys: string[]) => api<ProposeResult>("/admin/master-settings/reset", { method: "POST", body: { keys } }),

  /** Dry run of the PayPal mode switch checks (real PayPal calls; no code, no change). */
  paypalCheck: (mode: "sandbox" | "live") =>
    api<PaypalCheckResult>("/admin/master-settings/paypal/check", { method: "POST", body: { mode } }),
};
