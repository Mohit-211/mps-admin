import { api } from "../lib/api";

// Citations admin — docs/CITATIONS_ADMIN_CLAUDE_NOTE.md, API.md "Citations (Phase 16)".
// citations.view to read, citations.manage to change. Citations are manual: no automatic checks.

export type CitationStatus =
  | "not_checked"
  | "live_correct"
  | "nap_wrong"
  | "not_found"
  | "duplicate"
  | "submitted"
  | "pending"
  | "removed";

export const CITATION_STATUSES: CitationStatus[] = [
  "not_checked",
  "live_correct",
  "nap_wrong",
  "not_found",
  "duplicate",
  "submitted",
  "pending",
  "removed",
];

export const CITATION_STATUS_LABELS: Record<CitationStatus, string> = {
  not_checked: "Not checked",
  live_correct: "Live, correct",
  nap_wrong: "NAP wrong",
  not_found: "Not found",
  duplicate: "Duplicate",
  submitted: "Submitted",
  pending: "Pending",
  removed: "Removed (taken down)",
};

export type DirectoryType = "general" | "niche" | "aggregator" | "social" | "government_chamber";
export const DIRECTORY_TYPES: DirectoryType[] = ["general", "niche", "aggregator", "social", "government_chamber"];
export const DIRECTORY_TYPE_LABELS: Record<DirectoryType, string> = {
  general: "General",
  niche: "Niche",
  aggregator: "Aggregator",
  social: "Social",
  government_chamber: "Government / chamber",
};

export type CitationCountry = "US" | "CA";
export type Nap = { name: string | null; address: string | null; phone: string | null; website: string | null };
export type NapField = keyof Nap;

export type Directory = {
  id: string;
  name: string;
  url: string;
  domain: string;
  type: DirectoryType;
  categories: { id: string; name: string; slug: string }[];
  countries: CitationCountry[];
  regions: string[];
  authority: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  used_by_locations?: number;
};

export type DirectoryInput = {
  name: string;
  url: string;
  type: DirectoryType;
  countries: CitationCountry[];
  category_ids?: string[];
  regions?: string[];
  authority?: number | null;
  notes?: string | null;
  is_active?: boolean;
};

export type DirectoryCategory = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  business_categories: { id: string; name: string }[];
  directory_count: number;
};

export type CitationCounts = Record<CitationStatus, number>;

export type Health = {
  score: number | null;
  grade: string | null;
  coverage: number | null;
  scored?: number;
  total: number;
  counts: CitationCounts;
};

export type CitationEntry = {
  id: string;
  directory: {
    id: string;
    name: string;
    url: string;
    domain: string;
    type: DirectoryType;
    authority: number | null;
    is_active: boolean;
  };
  status: CitationStatus;
  listing_url: string | null;
  nap_found: Partial<Nap> | null;
  mismatch_fields: NapField[];
  /** Internal note on the entry (customers never see it). */
  notes: string | null;
  last_checked_at: string | null;
  checked_by: string | null;
  source: string | null;
  active: boolean;
};

export type LocationRef = {
  id: string;
  name: string;
  city: string | null;
  country?: string | null;
  organization: { id: string; name: string | null; type?: string | null } | null;
  client: { id: string; name: string | null } | null;
};

export type LocationIndexRow = {
  location: LocationRef;
  /** Phase 21: MyPageSEO employees assigned to this location ([] = nobody). */
  assigned_staff?: { id: string; name: string | null }[];
  /** null: no citation list yet (open it and run suggest). */
  citations: {
    score: number | null;
    grade: string | null;
    coverage: number | null;
    total: number;
    counts: CitationCounts;
    last_checked_at: string | null;
  } | null;
};

export type LocationCitations = {
  location: LocationRef & { state: string | null; nap: Nap };
  business_categories: string[];
  category_groups: { id: string; name: string }[];
  category_matched: boolean;
  health: Health;
  entries: CitationEntry[];
  removed_from_list: CitationEntry[];
};

export type SuggestResult = {
  country: string | null;
  region: string | null;
  business_categories: string[];
  category_groups: { id: string; name: string }[];
  category_matched: boolean;
  dry_run: boolean;
  added: { directory_id: string; name: string; type: DirectoryType }[];
  already_listed: number;
  reason?: "unsupported_country";
};

export type EntryUpdate = {
  status?: CitationStatus;
  listing_url?: string | null;
  nap_found?: Partial<Nap>;
  notes?: string | null;
  note?: string;
  checked?: boolean;
  confirm?: boolean;
};

export type HistoryRow = {
  id: string;
  action: string;
  from: CitationStatus | null;
  to: CitationStatus | null;
  changed_fields: string[];
  note: string | null;
  by: { admin_id: string | null; name: string | null };
  at: string;
};

export type ImportResult = {
  dry_run: boolean;
  applied: boolean;
  rows: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: { row: number; field: string; message: string }[];
};

export type QueueFilters = {
  organization_id?: string;
  client_id?: string;
  directory_id?: string;
  type?: DirectoryType;
  status?: CitationStatus;
  days?: number;
  page?: number;
  limit?: number;
};

type Page<K extends string, T> = { [key in K]: T[] } & { page: number; limit: number; total: number };

export const citationsApi = {
  // locations
  locations: (
    query: {
      q?: string;
      organization_id?: string;
      client_id?: string;
      country?: CitationCountry;
      list?: "has" | "none";
      sort?: "name" | "score" | "checked";
      /** Phase 21: one employee's assigned locations. */
      assigned_admin_id?: string;
      page?: number;
      limit?: number;
    },
    signal?: AbortSignal,
  ) => api<Page<"locations", LocationIndexRow>>("/admin/citations/locations", { query, signal }),
  location: (locationId: string, signal?: AbortSignal) =>
    api<LocationCitations>(`/admin/citations/locations/${locationId}`, { signal }),
  suggest: (locationId: string, dryRun: boolean) =>
    api<SuggestResult>(`/admin/citations/locations/${locationId}/suggest`, {
      method: "POST",
      query: dryRun ? { dry_run: true } : undefined,
    }),
  addEntries: (locationId: string, directory_ids: string[]) =>
    api<{ added: number; restored: number; already_listed: number; health: Health }>(
      `/admin/citations/locations/${locationId}/entries`,
      { method: "POST", body: { directory_ids } },
    ),

  // entries
  updateEntry: (entryId: string, body: EntryUpdate) =>
    api<{ entry: CitationEntry; changed: string[] }>(`/admin/citations/entries/${entryId}`, { method: "PATCH", body }),
  removeEntry: (entryId: string, note?: string) =>
    api<{ entry: CitationEntry; changed: string[] }>(`/admin/citations/entries/${entryId}`, {
      method: "DELETE",
      body: note ? { note } : {},
    }),
  restoreEntry: (entryId: string, note?: string) =>
    api<{ entry: CitationEntry; changed: string[] }>(`/admin/citations/entries/${entryId}/restore`, {
      method: "POST",
      body: note ? { note } : {},
    }),
  history: (entryId: string, query: { page?: number; limit?: number }, signal?: AbortSignal) =>
    api<Page<"history", HistoryRow>>(`/admin/citations/entries/${entryId}/history`, { query, signal }),
  bulk: (body: { entry_ids: string[]; status: CitationStatus; note?: string }) =>
    api<{ updated: number; unchanged: number; skipped: { entry_id: string; reason: string }[] }>(
      "/admin/citations/entries/bulk",
      { method: "POST", body },
    ),

  // work queue
  queueUnchecked: (query: QueueFilters, signal?: AbortSignal) =>
    api<
      Page<
        "locations",
        { location: LocationRef; unchecked: number; active_entries: number; oldest_added_at: string | null }
      >
    >("/admin/citations/queue/unchecked", { query, signal }),
  queueStale: (query: QueueFilters, signal?: AbortSignal) =>
    api<Page<"entries", CitationEntry & { location: LocationRef; days_since_check: number }> & { days: number }>(
      "/admin/citations/queue/stale",
      { query, signal },
    ),
  queueRecent: (query: QueueFilters, signal?: AbortSignal) =>
    api<
      Page<
        "changes",
        HistoryRow & { directory: { id: string; name: string; type: DirectoryType } | null; location: LocationRef }
      > & { days: number }
    >("/admin/citations/queue/recent", { query, signal }),

  // directories
  directories: (
    query: {
      q?: string;
      type?: DirectoryType;
      country?: CitationCountry;
      category_id?: string;
      active?: boolean;
      page?: number;
      limit?: number;
    },
    signal?: AbortSignal,
  ) => api<Page<"directories", Directory>>("/admin/citations/directories", { query, signal }),
  directory: (directoryId: string, signal?: AbortSignal) =>
    api<Directory>(`/admin/citations/directories/${directoryId}`, { signal }),
  createDirectory: (body: DirectoryInput) =>
    api<Directory>("/admin/citations/directories", { method: "POST", body }),
  updateDirectory: (directoryId: string, body: Partial<DirectoryInput>) =>
    api<Directory>(`/admin/citations/directories/${directoryId}`, { method: "PATCH", body }),
  /** "Delete" is a deactivate: no longer suggested; entries keep it. */
  deactivateDirectory: (directoryId: string) =>
    api<Directory>(`/admin/citations/directories/${directoryId}`, { method: "DELETE" }),
  exportPath: "/admin/citations/directories/export",
  importDirectories: (csv: string, dryRun: boolean) =>
    api<ImportResult>("/admin/citations/directories/import", {
      method: "POST",
      rawBody: { content: csv, contentType: "text/csv" },
      query: dryRun ? { dry_run: true } : undefined,
    }),

  // categories
  categories: (signal?: AbortSignal) => api<DirectoryCategory[]>("/admin/citations/categories", { signal }),
  createCategory: (body: { name: string; slug?: string; business_category_ids?: string[]; is_active?: boolean }) =>
    api<DirectoryCategory>("/admin/citations/categories", { method: "POST", body }),
  updateCategory: (
    categoryId: string,
    body: Partial<{ name: string; slug: string; business_category_ids: string[]; is_active: boolean }>,
  ) => api<DirectoryCategory>(`/admin/citations/categories/${categoryId}`, { method: "PATCH", body }),
  deleteCategory: (categoryId: string) =>
    api<{ deleted: true }>(`/admin/citations/categories/${categoryId}`, { method: "DELETE" }),
  businessCategories: (q: string, signal?: AbortSignal) =>
    api<{ id: string; name: string }[]>("/admin/citations/business-categories", { query: { q }, signal }),
};

export const NAP_FIELDS: { key: NapField; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
];
