import { api } from "../lib/api";
import type { OrgState } from "./organizations";

// GET /admin/overview — docs/ADMIN_PANEL.md §8, platform.read.

export type Overview = {
  organizations: {
    total: number;
    by_type: Partial<Record<"business" | "agency", number>>;
    by_state: Partial<Record<OrgState, number>>;
  };
  /** MRR is per currency: never add USD and CAD together. */
  subscriptions: { paying: number; past_due: number; mrr: Record<string, number> };
  trials_ending_7d: number;
  token_sales_30d: Record<string, { count: number; total: number }>;
  signups_30d: { users: number; organizations: number };
  open_tickets: number;
  generated_at: string;
};

export const overviewApi = {
  get: (signal?: AbortSignal) => api<Overview>("/admin/overview", { signal }),
};
