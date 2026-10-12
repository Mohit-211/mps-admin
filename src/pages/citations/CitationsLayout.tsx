import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { PageHeader } from "../../components/ui/PageHeader";
import { Notice } from "../../components/ui/Panel";

const SECTIONS = [
  { to: "/citations/locations", label: "Locations" },
  { to: "/citations/queue", label: "Work queue" },
  { to: "/citations/directories", label: "Directories" },
  { to: "/citations/categories", label: "Categories" },
];

/** Citations are manual: the team records what it finds on each directory. There are no automatic checks. */
export function CitationsLayout() {
  const { admin } = useAuth();
  const limited = admin?.citation_scope === "assigned";
  return (
    <div className="page-container">
      <PageHeader
        title="Citations"
        description="Manual citation tracking: keep the directory list, build each location's list and record what you find. Customers see the result read-only, as “MyPageSEO team”."
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
      {limited && (
        <div className="mb-5">
          <Notice tone="blue">
            You work on {admin?.assigned_locations ?? 0} assigned location{admin?.assigned_locations === 1 ? "" : "s"}. The lists and
            queues show only those; directories and categories are shared. Ask a super admin to change your locations.
          </Notice>
        </div>
      )}
      <Outlet />
    </div>
  );
}
