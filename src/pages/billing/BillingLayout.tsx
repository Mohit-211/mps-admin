import { NavLink, Outlet } from "react-router-dom";

import { PageHeader } from "../../components/ui/PageHeader";

const SECTIONS = [
  { to: "/billing/plans", label: "Plans & pricing" },
  { to: "/billing/subscriptions", label: "Subscriptions" },
  { to: "/billing/invoices", label: "Invoices" },
  { to: "/billing/token-packs", label: "Token packs" },
  { to: "/billing/coupons", label: "Coupons" },
  { to: "/billing/audit", label: "Audit log" },
];

/** Billing (billing.read; changes need billing.manage). No tax; coupons apply to token packs only. */
export function BillingLayout() {
  return (
    <div className="page-container">
      <PageHeader
        title="Billing"
        description="Prices per location (USD and CAD), subscriptions, invoices, token packs and coupons. No tax; coupons apply to token packs only."
      />
      <nav className="mb-5 overflow-x-auto border-b border-[var(--color-border)]">
        <div className="flex min-w-max gap-1">
          {SECTIONS.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              className={({ isActive }) =>
                `-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`
              }
            >
              {section.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
