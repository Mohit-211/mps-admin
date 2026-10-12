import { LogOut, UserCog, X } from "lucide-react";
import { useEffect } from "react";
import { NavLink } from "react-router-dom";

import { supportApi } from "../../api/support";
import { useAuth } from "../../auth/useAuth";
import { useQuery } from "../../hooks/useQuery";
import { initialsOf } from "../../lib/format";
import { navigation } from "./navigation";

type SidebarProps = {
  /** Phone/tablet drawer state (the sidebar is always shown from lg up). */
  mobileOpen?: boolean;
  onClose?: () => void;
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]",
  ].join(" ");

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const { admin, can, logout } = useAuth();
  const items = navigation.filter((item) => can(item.permission));
  const waiting = useOpenTicketCount(can("support.read"));

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-[#172326]/40 lg:hidden" onClick={onClose} aria-hidden />
      )}
    <aside
      className={[
        "h-screen w-[248px] shrink-0 flex-col border-r border-[var(--color-border)] bg-white",
        "fixed inset-y-0 left-0 z-40 lg:sticky lg:top-0 lg:z-auto lg:flex",
        mobileOpen ? "flex" : "hidden",
      ].join(" ")}
    >
      <div className="flex h-16 items-center justify-between border-b border-[var(--color-border-light)] px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-sm font-bold text-white">
            M
          </div>

          <div>
            <div className="text-[15px] font-bold leading-none text-[var(--color-primary)]">
              MyPageSEO
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Admin Console
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] lg:hidden"
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const Icon = item.icon;
          const badge = item.to === "/support" && waiting ? waiting : null;
          return (
            <NavLink onClick={onClose} key={item.to} to={item.to} className={linkClass}>
              <Icon size={18} strokeWidth={1.8} />
              <span className="flex-1">{item.label}</span>
              {badge !== null && (
                <span
                  className="min-w-5 rounded-full bg-[var(--color-secondary)] px-1.5 py-0.5 text-center text-[10px] font-bold text-white"
                  title={`${badge} ticket${badge === 1 ? "" : "s"} waiting for the team`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </NavLink>
          );
        })}
        {items.length > 0 && <div className="my-2 border-t border-[var(--color-border-light)]" />}
        <NavLink onClick={onClose} to="/account" className={linkClass}>
          <UserCog size={18} strokeWidth={1.8} />
          <span>My account</span>
        </NavLink>
      </nav>

      <div className="border-t border-[var(--color-border-light)] p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
            {initialsOf(admin?.name || admin?.email)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
              {admin?.name || admin?.email}
            </div>
            <div className="truncate text-xs text-[var(--color-text-muted)]">
              {admin?.role_name}
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-danger)]"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}

/**
 * Tickets waiting for the team (status "open"). There are no email notifications for new tickets yet
 * (Phase 15), so the menu count is how admins notice them. Refreshed every 2 minutes.
 */
function useOpenTicketCount(enabled: boolean): number | null {
  const counts = useQuery(`ticket-counts:${enabled}`, (signal) =>
    enabled ? supportApi.counts(signal) : Promise.resolve(null),
  );
  const { reload } = counts;
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(reload, 120_000);
    return () => clearInterval(id);
  }, [enabled, reload]);
  return counts.data?.open ?? null;
}
