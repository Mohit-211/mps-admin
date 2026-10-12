import { api } from "../lib/api";

// The quick audit: the sales audit (/staff/audits, audits.run) and the marketing site's free-audit
// leads (/admin/leads/audits, leads.read / leads.manage) share one result shape (API.md "Sales audit
// (Phase 19)" and "Free audit, marketing site (Phase 20)").

export type CheckState = "good" | "partial" | "missing";
export type ChecklistItem = { id: string; label: string; state: CheckState; detail: string };
export type QuickScore = {
  score: number;
  grade: string;
  flag?: string | null;
  parts?: { id: string; points: number; max: number; available: boolean }[];
};

export type AuditBusiness = {
  place_id?: string;
  name: string | null;
  address: string | null;
  lat?: number;
  lng?: number;
  country?: string | null;
  rating: number | null;
  user_rating_count: number | null;
  category?: string | null;
  website?: string | null;
  phone?: string | null;
  has_hours?: boolean;
  photo_count?: number | null;
  score?: QuickScore | null;
  checklist?: ChecklistItem[];
};

export type AuditCell = { row: number; col: number; lat?: number; lng?: number; rank: number | null; status: string };

export type AuditSummary = {
  center_rank: number | null;
  center_status?: string;
  avg_rank: number | null;
  found_rate: number | null;
  top3_rate: number | null;
  points?: number;
  failed_points?: number;
  area_rank?: number | null;
};

export type AuditCompetitor = {
  rank: number | null;
  avg_rank?: number | null;
  top3_rate?: number | null;
  name: string | null;
  address: string | null;
  facts: Partial<AuditBusiness> | null;
  score: QuickScore | null;
  checklist: ChecklistItem[] | null;
};

export type AuditResult = {
  cells: AuditCell[];
  summary: AuditSummary;
  basis?: "area";
  /** Up to 10 businesses ahead across the area, then the business's own row (is_self). null: names unavailable. */
  higher:
    | { rank: number | null; name: string | null; address: string | null; is_self: boolean; avg_rank?: number | null; top3_rate?: number | null }[]
    | null;
  competitors: AuditCompetitor[];
  area?: { entries?: number; self_rank: number | null; ahead: number; seen: number; points: number };
};

export type AuditGrid = { size: number; radius_km: number; spacing_km: number };

export type SalesAudit = {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  keyword: string;
  business: AuditBusiness;
  grid: AuditGrid;
  result: AuditResult | null;
  /** Up to 5 "what to work on first" sentences, as in the PDF. [] = the profile looks complete; null = not done yet. */
  actions?: string[] | null;
  warnings: string[];
  failure_reason: string | null;
  api_calls?: Record<string, number>;
  created_at: string;
  finished_at: string | null;
  expires_at: string | null;
  attribution: { provider: string; text: string };
};

export type PlaceSuggestion = {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
};

export const salesAuditApi = {
  autocomplete: (input: string, session: string, signal?: AbortSignal) =>
    api<{ suggestions: PlaceSuggestion[]; attribution: { provider: string; text: string } }>(
      "/staff/audits/places/autocomplete",
      { query: { input, session }, signal },
    ),
  /** The caller's open audits, without results (to find one again after a reload). */
  list: (signal?: AbortSignal) => api<{ audits: SalesAudit[] }>("/staff/audits", { signal }),
  start: (body: { place_id: string; session: string; keyword: string }) =>
    api<SalesAudit>("/staff/audits", { method: "POST", body }),
  get: (auditId: string, signal?: AbortSignal) => api<SalesAudit>(`/staff/audits/${auditId}`, { signal }),
  pdfPath: (auditId: string) => `/staff/audits/${auditId}/pdf`,
  /** Close = delete. There is no audit history. */
  close: (auditId: string) => api<{ deleted: true; id: string }>(`/staff/audits/${auditId}`, { method: "DELETE" }),
};

// ---- free-audit leads ----

export type LeadStage =
  | "preview_queued"
  | "preview_running"
  | "preview_done"
  | "full_queued"
  | "full_running"
  | "done"
  | "failed";

export type LeadRow = {
  id: string;
  created_at: string;
  stage: LeadStage;
  keyword: string;
  business: { name: string | null; address: string | null; rating: number | null; user_rating_count: number | null };
  center: { source: "business" | "city"; label: string | null };
  lead: { business_name: string | null; name: string | null; email: string | null; phone: string | null; verified_at: string | null } | null;
  summary: { center_rank: number | null; avg_rank: number | null; top3_rate: number | null } | null;
  score: { score: number; grade: string } | null;
};

export type LeadDetail = {
  id: string;
  stage: LeadStage;
  keyword: string;
  business: AuditBusiness;
  center: { source: "business" | "city"; label: string | null; lat?: number; lng?: number };
  grid: AuditGrid;
  result: AuditResult | null;
  /** As on the sales audit: [] = the profile looks complete; null = not done yet. */
  actions?: string[] | null;
  warnings: string[];
  failure_reason: string | null;
  lead: {
    business_name: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    consent_at: string | null;
    consent_text_version: string | null;
    verified_at: string | null;
    submitted_at: string | null;
  } | null;
  api_calls?: Record<string, number>;
  report_emailed_at: string | null;
  created_at: string;
  finished_at: string | null;
  expires_at: string | null;
  attribution: { provider: string; text: string };
};

export type LeadListQuery = { from?: string; to?: string; verified?: boolean; q?: string; page?: number; limit?: number };

export const leadsApi = {
  list: (query: LeadListQuery, signal?: AbortSignal) =>
    api<{ leads: LeadRow[]; page: number; limit: number; total: number }>("/admin/leads/audits", { query, signal }),
  exportPath: "/admin/leads/audits/export",
  get: (leadId: string, signal?: AbortSignal) => api<LeadDetail>(`/admin/leads/audits/${leadId}`, { signal }),
  pdfPath: (leadId: string) => `/admin/leads/audits/${leadId}/pdf`,
  /** Privacy requests (leads.manage). Audit-logged. */
  remove: (leadId: string) => api<{ deleted: true; id: string }>(`/admin/leads/audits/${leadId}`, { method: "DELETE" }),
};

export const AUDIT_FAILURES: Record<string, string> = {
  search_failed: "Every grid search failed.",
  places_not_configured: "Google Places isn't configured on the server.",
  enqueue_failed: "The audit couldn't be queued.",
  timed_out: "The audit didn't finish within 10 minutes.",
  internal_error: "Something went wrong on the server.",
};

export const AUDIT_WARNINGS: Record<string, string> = {
  some_points_failed: "Some grid points failed (shown as –) and are left out of the averages.",
  names_unavailable: "Business names couldn't be loaded, so “who ranks higher” isn't available.",
  some_competitors_unavailable: "Some competitors' public profiles couldn't be loaded.",
};
