import { Menu, Search } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { initialsOf } from "../../lib/format";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { admin, can } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

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

      {/* Searches organizations by name or owner email (the main customer screen). */}
      {can("platform.read") && (
        <form
          className="hidden max-w-md flex-1 lg:flex"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const q = term.trim();
            navigate(q ? `/organizations?q=${encodeURIComponent(q)}` : "/organizations");
            setTerm("");
          }}
        >
          <label className="relative block w-full">
            <span className="sr-only">Search organizations</span>
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search organizations by name or owner email…"
              className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
            />
          </label>
        </form>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/account"
          className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-[var(--color-surface-muted)]"
          title="My account"
        >
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
        </Link>
      </div>
    </header>
  );
}
