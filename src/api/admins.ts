import { api } from "../lib/api";
import type { Admin, Permission } from "./auth";

// Employees (platform admins) — docs/ADMIN_PANEL.md §4, permission admins.manage.

export type Role = { role_id: number; key: string; name: string; active: boolean; permissions: Permission[] };

export type CreateAdminInput = {
  name: string;
  email: string;
  role_id: number;
  /** Optional: set the password now instead of emailing a set-password link. */
  password?: string;
  confirm_password?: string;
};

export type UpdateAdminInput = Partial<{ name: string; email: string; role_id: number; is_active: boolean }>;

export const adminsApi = {
  list: (active: boolean | undefined, signal?: AbortSignal) =>
    api<Admin[]>("/admin/admins", { query: { active }, signal }),

  get: (adminId: string, signal?: AbortSignal) => api<Admin>(`/admin/admins/${adminId}`, { signal }),

  create: (body: CreateAdminInput) =>
    api<Admin & { password_link_sent: boolean }>("/admin/admins", { method: "POST", body }),

  update: (adminId: string, body: UpdateAdminInput) =>
    api<Admin>(`/admin/admins/${adminId}`, { method: "PATCH", body }),

  resendPasswordLink: (adminId: string) =>
    api<{ password_link_sent: boolean; purpose: "set_password" | "reset_password" }>(
      `/admin/admins/${adminId}/password-link`,
      { method: "POST" },
    ),

  /** Set an employee's password (not your own). Ends their sessions and voids pending links. */
  setPassword: (adminId: string, body: { password: string; confirm_password: string }) =>
    api<Admin>(`/admin/admins/${adminId}/password`, { method: "POST", body }),

  roles: (signal?: AbortSignal) => api<Role[]>("/admin/roles", { signal }),
};
