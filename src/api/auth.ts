import { api } from "../lib/api";

// /admin/auth/* — docs/ADMIN_PANEL.md §3

export type Permission =
  | "admins.manage"
  | "platform.read"
  | "platform.write"
  | "billing.read"
  | "billing.manage"
  | "support.read"
  | "support.manage"
  | "citations.view"
  | "citations.manage"
  | "content.manage"
  | "audits.run";

export type Admin = {
  id: string;
  name: string | null;
  email: string;
  role_id: number;
  role_name: string;
  permissions: Permission[];
  is_active: boolean;
  password_set: boolean;
  last_login_at: string | null;
  created_at: string;
};

export const authApi = {
  login: (body: { email: string; password: string }) =>
    api<{ admin: Admin; token: string }>("/admin/auth/login", { method: "POST", body, auth: false }),

  me: (signal?: AbortSignal) => api<Admin>("/admin/auth/me", { signal }),

  forgotPassword: (body: { email: string }) =>
    api<{ reset: string }>("/admin/auth/forgot-password", { method: "POST", body, auth: false }),

  resetPassword: (body: { token: string; password: string; confirm_password: string }) =>
    api<unknown>("/admin/auth/reset-password", { method: "POST", body, auth: false }),

  changePassword: (body: { current_password: string; new_password: string; confirm_password: string }) =>
    api<{ changed: true; token: string }>("/admin/auth/change-password", { method: "POST", body }),
};
