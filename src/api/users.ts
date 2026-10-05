import { api } from "../lib/api";

// Customers — docs/ADMIN_PANEL.md §5 (platform.read / platform.write).

export type OrgType = "business" | "agency";
export type MemberRole = "owner" | "member" | "client_user";

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  /** BUSINESS | AGENCY | EMPLOYEE | CLIENT (legacy account type) */
  user_type: string | null;
  /** Raw account status, e.g. ACCEPTED, PENDING, BLOCKED */
  status: string;
  disabled: boolean;
  email_verified_at: string | null;
  created_at: string;
  last_login_at: string | null;
  organizations: number;
  organization: { id: string; name: string; type: OrgType; role: MemberRole } | null;
};

export type UserDetail = UserRow & {
  mobile: string | null;
  memberships: {
    organization_id: string;
    organization: string | null;
    type: OrgType | null;
    role: MemberRole;
    status: string;
  }[];
  recent_logins: { at: string | null; logged_out_at: string | null; ip: string | null }[];
  google_connections: { google_email: string; status: string }[];
};

export type UserListQuery = {
  q?: string;
  status?: "active" | "disabled" | "unverified";
  type?: OrgType;
  role?: MemberRole;
  organization_id?: string;
  page?: number;
  limit?: number;
};

export type CreateUserInput =
  | {
      email: string;
      name: string;
      account_type: OrgType;
      organization_name: string;
      country: "US" | "CA";
      send_email?: boolean;
    }
  | {
      email: string;
      name: string;
      organization_id: string;
      role: "member" | "client_user";
      client_ids?: string[];
      send_email?: boolean;
    };

export type OwnsOrganizationBlocker = {
  id: string;
  name: string;
  other_members: number;
  locations: number;
  open_subscription: boolean;
};

export const usersApi = {
  list: (query: UserListQuery, signal?: AbortSignal) =>
    api<{ users: UserRow[]; page: number; limit: number; total: number }>("/admin/users", { query, signal }),

  get: (userId: string, signal?: AbortSignal) => api<UserDetail>(`/admin/users/${userId}`, { signal }),

  create: (body: CreateUserInput) =>
    api<{
      user: UserDetail;
      organization_id: string;
      role: MemberRole;
      new_account: boolean;
      password_email_sent: boolean;
    }>("/admin/users", { method: "POST", body }),

  /** Edit name / email / mobile. A new email stays verified and ends every session. */
  update: (userId: string, body: { name?: string; email?: string; mobile?: string | null }) =>
    api<UserDetail>(`/admin/users/${userId}`, { method: "PATCH", body }),

  remove: (userId: string, reason: string) =>
    api<{ deleted: true; id: string; organizations_deleted: { id: string; name: string }[] }>(
      `/admin/users/${userId}`,
      { method: "DELETE", body: { reason } },
    ),

  disable: (userId: string, reason: string) =>
    api<UserDetail>(`/admin/users/${userId}/disable`, { method: "POST", body: { reason } }),
  enable: (userId: string) => api<UserDetail>(`/admin/users/${userId}/enable`, { method: "POST" }),
  logout: (userId: string) => api<{ logged_out: true }>(`/admin/users/${userId}/logout`, { method: "POST" }),
  resendVerification: (userId: string) =>
    api<{ email_verification: string }>(`/admin/users/${userId}/resend-verification`, { method: "POST" }),
  verify: (userId: string) => api<UserDetail>(`/admin/users/${userId}/verify`, { method: "POST" }),
};

/** One display status for a user row. */
export function userStatus(user: Pick<UserRow, "disabled" | "email_verified_at">): "disabled" | "unverified" | "active" {
  if (user.disabled) return "disabled";
  if (!user.email_verified_at) return "unverified";
  return "active";
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  member: "Team member",
  client_user: "Client user",
};
