import { api } from "../lib/api";

// Billing admin — docs/ADMIN_PANEL.md §6.5–6.6, API.md "Billing admin", ENDPOINTS.md #122–#151.
// billing.read to read, billing.manage to change.

export type Currency = "USD" | "CAD";
export const CURRENCIES: Currency[] = ["USD", "CAD"];

export const FEATURES = [
  "rank_tracker",
  "grid",
  "map_ranking",
  "gbp_report",
  "citations",
  "reports",
  "white_label",
  "competitors",
  "team",
  "gbp_posts",
] as const;
export type Feature = (typeof FEATURES)[number];

export const FEATURE_LABELS: Record<Feature, string> = {
  rank_tracker: "Rank tracker",
  grid: "Local search grid",
  map_ranking: "Map ranking",
  gbp_report: "GBP report",
  citations: "Citations",
  reports: "Reports center",
  white_label: "White label",
  competitors: "Competitors",
  team: "Team",
  gbp_posts: "GBP posts",
};

export type AiTokenCosts = {
  reply_drafts_per_10: number;
  analysis_per_10: number;
  appeal: number;
  insights: number;
  post_draft: number;
  post_image: number;
  /** Phase 22: AI post topic ideas. */
  post_topics: number;
};

export const AI_COST_FIELDS: { key: keyof AiTokenCosts; label: string; fallback: number }[] = [
  { key: "reply_drafts_per_10", label: "AI reply drafts (per 10 reviews)", fallback: 1 },
  { key: "analysis_per_10", label: "Review analysis (per 10)", fallback: 1 },
  { key: "appeal", label: "Removal-request draft", fallback: 1 },
  { key: "insights", label: "Review insights", fallback: 2 },
  { key: "post_draft", label: "AI post text", fallback: 1 },
  { key: "post_image", label: "AI post image", fallback: 3 },
  { key: "post_topics", label: "AI post topic ideas", fallback: 1 },
];

export type PlanPrice = {
  currency: Currency;
  first_location_price: number;
  additional_location_price: number;
  effective_from: string;
  set_by: string | null;
  set_at: string | null;
};

export type Plan = {
  id: string;
  name: string;
  kind: "standard" | "custom";
  organization_id: string | null;
  /** The custom plan's organization; null for the standard plan or a deleted organization. */
  organization_name?: string | null;
  entitlements: Partial<Record<Feature, boolean>>;
  users_per_location: number;
  max_locations: number | null;
  trial: { days: number; locations: number; users: number; tokens: number };
  tokens_per_refresh: { rankings: number; gbp: number };
  ai_token_costs: AiTokenCosts;
  monthly_token_grant: number;
  token_pack_discount_percent: number;
  token_pack_prices: { pack_id: string; currency: Currency; price: number }[];
  prices: PlanPrice[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PlanSettings = Partial<{
  name: string;
  entitlements: Partial<Record<Feature, boolean>>;
  users_per_location: number;
  max_locations: number | null;
  trial: Plan["trial"];
  tokens_per_refresh: Plan["tokens_per_refresh"];
  ai_token_costs: AiTokenCosts;
  monthly_token_grant: number;
  token_pack_discount_percent: number;
  token_pack_prices: Plan["token_pack_prices"];
  is_active: boolean;
}>;

export type BillingMethod = "paypal" | "manual";
export type SubscriptionStatus = "approval_pending" | "active" | "past_due" | "suspended" | "cancelled" | "expired";
export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "approval_pending",
  "active",
  "past_due",
  "suspended",
  "cancelled",
  "expired",
];

export type Subscription = {
  id: string;
  organization_id: string;
  organization_name?: string | null;
  plan_id: string;
  billing_method: BillingMethod;
  provider_subscription_id: string | null;
  currency: Currency;
  status: SubscriptionStatus;
  open: boolean;
  paid_quantity: number;
  price: { first: number; additional: number };
  current_period_start: string | null;
  current_period_end: string | null;
  next_renewal: { period_end: string; quantity: number; amount: number } | null;
  pending_lines: { label: string; quantity: number; unit_price: number; amount: number }[];
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  past_due_since: string | null;
  failed_payments: number;
  last_payment_at: string | null;
  comp_until: string | null;
  note: string | null;
  created_at: string;
};

export type SubscriptionDetail = Subscription & {
  events: { at: string; type: string; detail: string | null }[];
  invoices: Invoice[];
};

export type InvoiceKind = "subscription" | "location_slots" | "token_pack" | "manual";
export type InvoiceStatus = "open" | "paid" | "refunded" | "void";
export const INVOICE_KINDS: InvoiceKind[] = ["subscription", "location_slots", "token_pack", "manual"];
export const INVOICE_STATUSES: InvoiceStatus[] = ["open", "paid", "refunded", "void"];

export type Invoice = {
  id: string;
  number: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  currency: Currency;
  lines: { label: string; quantity: number; unit_price: number; amount: number }[];
  tax_lines: unknown[];
  total: number;
  charged_amount: number | null;
  period_start: string | null;
  period_end: string | null;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  has_pdf: boolean;
  // admin list only
  organization_id?: string;
  customer?: { name?: string | null; email?: string | null; address?: string[] } | null;
  /** PayPal charged a different amount from the invoice. */
  mismatch?: boolean;
  payment_note?: string | null;
};

/** The customer billing page view (GET /billing), as embedded in the admin organization views. */
export type BillingView = {
  state: string;
  read_only: boolean;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  currency: Currency;
  plan: { id: string; name: string; kind: "standard" | "custom"; max_locations: number | null; users_per_location: number };
  prices: {
    current: { first_location: number; additional_location: number } | null;
    upcoming: { first_location: number; additional_location: number; effective_from: string } | null;
  };
  subscription: {
    id: string;
    status: SubscriptionStatus;
    billing_method: BillingMethod;
    paid_quantity: number;
    price: { first_location: number; additional_location: number };
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    comp_until: string | null;
  } | null;
  next_renewal: { date: string; quantity: number; amount: number | null; fixed: boolean } | null;
  locations: { active: number; allowed: number; free: number; max: number | null };
  users: { used: number; limit: number };
  tokens: {
    balance: number;
    cost_per_refresh: { rankings: number; gbp: number };
    ai_costs?: Partial<AiTokenCosts>;
    monthly_grant: number;
    last_grant_at: string | null;
    next_grant_at: string | null;
  };
  billing_details: Record<string, string | null> | null;
  online_payments: boolean;
};

export type AuditEntry = {
  id: string;
  action: string;
  organization_id: string | null;
  /** null for entries without an organization (employees, coupons, packs) or a deleted one. */
  organization_name?: string | null;
  target: string | null;
  before: unknown;
  after: unknown;
  note: string | null;
  by: { admin_id: string | null; name: string | null };
  at: string;
};

export type OrganizationBilling = {
  organization: {
    id: string;
    name: string;
    type: "business" | "agency";
    country: string | null;
    plan_id: string | null;
    billing_method: BillingMethod;
    trial_ends_at: string | null;
    suspended_at: string | null;
  };
  billing: BillingView;
  subscriptions: Subscription[];
  invoices: Invoice[];
  audit: AuditEntry[];
};

export type LedgerType = "purchase" | "spend" | "refund" | "grant" | "monthly_grant" | "adjustment" | "expiry";
export type LedgerEntry = {
  id: string;
  type: LedgerType;
  amount: number;
  balance_after: number;
  ref: string | null;
  location_id: string | null;
  note: string | null;
  by: string | null;
  at: string;
};

export type TokenPack = {
  id: string;
  name: string;
  tokens: number;
  prices: { currency: Currency; price: number }[];
  expires_after_days: number | null;
  is_active: boolean;
  sort_order: number;
};

export type Coupon = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  value: number;
  pack_ids: string[];
  max_redemptions: number | null;
  redemptions: number;
  expires_at: string | null;
  is_active: boolean;
  note: string | null;
};

type Page<K extends string, T> = { [key in K]: T[] } & { page: number; limit: number; total: number };

export const billingApi = {
  // plans and prices
  plans: (query: { kind?: "standard" | "custom"; organization_id?: string } = {}, signal?: AbortSignal) =>
    api<Plan[]>("/admin/billing/plans", { query, signal }),
  plan: (planId: string, signal?: AbortSignal) => api<Plan>(`/admin/billing/plans/${planId}`, { signal }),
  updatePlan: (planId: string, body: PlanSettings) =>
    api<Plan>(`/admin/billing/plans/${planId}`, { method: "PATCH", body }),
  addPrice: (
    planId: string,
    body: { currency: Currency; first_location_price: number; additional_location_price: number; effective_from: string },
  ) => api<Plan>(`/admin/billing/plans/${planId}/prices`, { method: "POST", body }),

  // one organization
  organization: (organizationId: string, signal?: AbortSignal) =>
    api<OrganizationBilling>(`/admin/billing/organizations/${organizationId}`, { signal }),
  createCustomPlan: (organizationId: string, body: PlanSettings & { billing_method?: BillingMethod }) =>
    api<Plan>(`/admin/billing/organizations/${organizationId}/custom-plan`, { method: "POST", body }),
  removeCustomPlan: (organizationId: string) =>
    api<{ plan_id: null }>(`/admin/billing/organizations/${organizationId}/custom-plan`, { method: "DELETE" }),
  setBillingMethod: (organizationId: string, billing_method: BillingMethod) =>
    api<{ billing_method: BillingMethod }>(`/admin/billing/organizations/${organizationId}/billing-method`, {
      method: "PATCH",
      body: { billing_method },
    }),
  startManualSubscription: (
    organizationId: string,
    body: { quantity: number; starts_at?: string; comp_until?: string | null; currency?: Currency; note?: string },
  ) => api<Subscription>(`/admin/billing/organizations/${organizationId}/manual-subscription`, { method: "POST", body }),
  adjustTokens: (organizationId: string, body: { amount: number; type: "grant" | "adjustment"; note: string }) =>
    api<{ balance: number }>(`/admin/billing/organizations/${organizationId}/tokens`, { method: "POST", body }),
  ledger: (organizationId: string, query: { page?: number; limit?: number }, signal?: AbortSignal) =>
    api<Page<"entries", LedgerEntry> & { balance: number }>(
      `/admin/billing/organizations/${organizationId}/tokens/ledger`,
      { query, signal },
    ),

  // subscriptions
  subscriptions: (
    query: { status?: SubscriptionStatus; billing_method?: BillingMethod; organization_id?: string; page?: number; limit?: number },
    signal?: AbortSignal,
  ) => api<Page<"subscriptions", Subscription>>("/admin/billing/subscriptions", { query, signal }),
  subscription: (subscriptionId: string, signal?: AbortSignal) =>
    api<SubscriptionDetail>(`/admin/billing/subscriptions/${subscriptionId}`, { signal }),
  updateSubscription: (
    subscriptionId: string,
    body: { comp_until?: string | null; paid_quantity?: number; note?: string | null },
  ) => api<Subscription>(`/admin/billing/subscriptions/${subscriptionId}`, { method: "PATCH", body }),
  syncSubscription: (subscriptionId: string) =>
    api<Subscription>(`/admin/billing/subscriptions/${subscriptionId}/sync`, { method: "POST" }),
  cancelSubscription: (subscriptionId: string, reason: string) =>
    api<Subscription>(`/admin/billing/subscriptions/${subscriptionId}/cancel`, { method: "POST", body: { reason } }),

  // invoices
  invoices: (
    query: { status?: InvoiceStatus; kind?: InvoiceKind; organization_id?: string; q?: string; page?: number; limit?: number },
    signal?: AbortSignal,
  ) => api<Page<"invoices", Invoice>>("/admin/billing/invoices", { query, signal }),
  recordPayment: (invoiceId: string, note: string) =>
    api<Invoice>(`/admin/billing/invoices/${invoiceId}/payments`, { method: "POST", body: { note } }),
  voidInvoice: (invoiceId: string, note: string) =>
    api<Invoice>(`/admin/billing/invoices/${invoiceId}/void`, { method: "POST", body: { note } }),
  invoicePdfPath: (invoiceId: string) => `/admin/billing/invoices/${invoiceId}/pdf`,

  // token packs and coupons
  packs: (signal?: AbortSignal) => api<TokenPack[]>("/admin/billing/token-packs", { signal }),
  createPack: (body: Omit<TokenPack, "id">) => api<TokenPack>("/admin/billing/token-packs", { method: "POST", body }),
  updatePack: (packId: string, body: Partial<Omit<TokenPack, "id">>) =>
    api<TokenPack>(`/admin/billing/token-packs/${packId}`, { method: "PATCH", body }),
  coupons: (signal?: AbortSignal) => api<Coupon[]>("/admin/billing/coupons", { signal }),
  createCoupon: (body: Omit<Coupon, "id" | "redemptions">) =>
    api<Coupon>("/admin/billing/coupons", { method: "POST", body }),
  updateCoupon: (couponId: string, body: Partial<Omit<Coupon, "id" | "code" | "redemptions">>) =>
    api<Coupon>(`/admin/billing/coupons/${couponId}`, { method: "PATCH", body }),

  // audit log (billing.* and admin.* actions)
  audit: (query: { organization_id?: string; action?: string; page?: number; limit?: number }, signal?: AbortSignal) =>
    api<Page<"entries", AuditEntry>>("/admin/billing/audit", { query, signal }),
};

export const LEDGER_LABELS: Record<LedgerType, string> = {
  purchase: "Purchase",
  spend: "Spent",
  refund: "Refund",
  grant: "Grant",
  monthly_grant: "Monthly grant",
  adjustment: "Adjustment",
  expiry: "Expired",
};

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  subscription: "Subscription",
  location_slots: "Location slots",
  token_pack: "Token pack",
  manual: "Manual",
};
