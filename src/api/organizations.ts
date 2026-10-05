import { api } from "../lib/api";
import type { OrgType } from "./users";

// Organizations — docs/ADMIN_PANEL.md §6. Only what the Users/Staff screens need so far.

export type OrganizationRow = {
  id: string;
  name: string;
  type: OrgType;
  country: string | null;
  owner_email: string | null;
  plan: string;
  state: string;
  trial_ends_at: string | null;
  locations: { used: number; allowed: number; free: number; max: number | null };
  users: { used: number; limit: number | null };
  token_balance: number;
  suspended_at: string | null;
  created_at: string;
};

export type AgencyClient = { id: string; name: string | null; is_active: boolean; locations: number };

export const organizationsApi = {
  list: (
    query: { q?: string; type?: OrgType; state?: string; page?: number; limit?: number },
    signal?: AbortSignal,
  ) =>
    api<{ organizations: OrganizationRow[]; page: number; limit: number; total: number }>("/admin/organizations", {
      query,
      signal,
    }),

  /** An agency's clients, for assigning a client_user. */
  clients: (organizationId: string, signal?: AbortSignal) =>
    api<AgencyClient[]>(`/admin/organizations/${organizationId}/clients`, { signal }),

  /** Remove a member from one organization; the account stays. The owner can't be removed. */
  removeMember: (organizationId: string, userId: string, reason: string) =>
    api<unknown>(`/admin/organizations/${organizationId}/members/${userId}`, { method: "DELETE", body: { reason } }),

  suspend: (organizationId: string, reason: string) =>
    api<unknown>(`/admin/organizations/${organizationId}/suspend`, { method: "POST", body: { reason } }),
};
