import { api } from "../lib/api";
import type { BillingView, Invoice } from "./billing";
import type { MemberRole, OrgType } from "./users";

// Organizations — docs/ADMIN_PANEL.md §6 (platform.read / platform.write).

export type OrgState = "trialing" | "active" | "past_due" | "inactive" | "suspended_by_admin";
export const ORG_STATES: OrgState[] = ["trialing", "active", "past_due", "inactive", "suspended_by_admin"];

export type OrganizationRow = {
  id: string;
  name: string;
  type: OrgType;
  country: string | null;
  owner_email: string | null;
  plan: "standard" | "custom";
  state: OrgState;
  trial_ends_at: string | null;
  locations: { used: number; allowed: number; free: number; max: number | null };
  users: { used: number; limit: number | null };
  token_balance: number;
  suspended_at: string | null;
  created_at: string;
};

export type LimitOverrides = { max_locations?: number | null; extra_users?: number; free_locations?: number };

export type OrganizationDetail = {
  organization: {
    id: string;
    name: string;
    type: OrgType;
    country: string | null;
    created_at: string;
    owner: { id: string; email: string | null };
    suspended_at: string | null;
    suspended_reason: string | null;
    limit_overrides: LimitOverrides | null;
  };
  /** Phase 21: a member with client_ids is limited to those clients (restricted). */
  members: {
    user_id: string;
    email: string | null;
    name: string | null;
    role: MemberRole;
    status: string;
    client_ids?: string[];
    restricted?: boolean;
  }[];
  locations: { id: string; name: string; city: string | null; gbp_connected: boolean; source: string | null }[];
  clients: number;
  billing: BillingView;
  invoices: Invoice[];
  citations: Record<string, number>;
};

export type OrganizationListQuery = {
  q?: string;
  type?: OrgType;
  state?: OrgState;
  plan?: "standard" | "custom";
  trial_ending_days?: number;
  page?: number;
  limit?: number;
};

export type AgencyClient = { id: string; name: string | null; is_active: boolean; locations: number };

export const organizationsApi = {
  list: (query: OrganizationListQuery, signal?: AbortSignal) =>
    api<{ organizations: OrganizationRow[]; page: number; limit: number; total: number }>("/admin/organizations", {
      query,
      signal,
    }),

  get: (organizationId: string, signal?: AbortSignal) =>
    api<OrganizationDetail>(`/admin/organizations/${organizationId}`, { signal }),

  /** An agency's clients, for assigning a client_user. */
  clients: (organizationId: string, signal?: AbortSignal) =>
    api<AgencyClient[]>(`/admin/organizations/${organizationId}/clients`, { signal }),

  /** Remove a member from one organization; the account stays. The owner can't be removed. */
  removeMember: (organizationId: string, userId: string, reason: string) =>
    api<OrganizationDetail>(`/admin/organizations/${organizationId}/members/${userId}`, {
      method: "DELETE",
      body: { reason },
    }),

  suspend: (organizationId: string, reason: string) =>
    api<OrganizationDetail>(`/admin/organizations/${organizationId}/suspend`, { method: "POST", body: { reason } }),

  unsuspend: (organizationId: string, note?: string) =>
    api<OrganizationDetail>(`/admin/organizations/${organizationId}/unsuspend`, {
      method: "POST",
      body: note ? { note } : {},
    }),

  setTrial: (organizationId: string, trial_ends_at: string) =>
    api<{ trial_ends_at: string }>(`/admin/organizations/${organizationId}/trial`, {
      method: "PATCH",
      body: { trial_ends_at },
    }),

  /** Replaces the whole override object: merge with the current limit_overrides first. `{}` clears them. */
  setLimits: (organizationId: string, body: LimitOverrides) =>
    api<OrganizationDetail>(`/admin/organizations/${organizationId}/limits`, { method: "PATCH", body }),
};

export const ORG_STATE_LABELS: Record<OrgState, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  inactive: "Inactive",
  suspended_by_admin: "Suspended",
};
