import { Bell, Menu, Search } from "lucide-react";

import { useAuth } from "../../auth/useAuth";
import { initialsOf } from "../../lib/format";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { admin } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-white/95 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] lg:hidden"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </button>

      <div className="hidden max-w-md flex-1 lg:flex">
        <label className="relative block w-full">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            type="search"
            placeholder="Search users, organizations..."
            className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          />
        </label>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--color-secondary)]" />
        </button>

        <div className="ml-2 hidden items-center gap-2 border-l border-[var(--color-border-light)] pl-4 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
            {initialsOf(admin?.name || admin?.email)}
          </div>

          <div className="hidden leading-tight md:block">
            <div className="text-xs font-semibold text-[var(--color-text-primary)]">
              {admin?.name || admin?.email}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">
              {admin?.role_name}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
