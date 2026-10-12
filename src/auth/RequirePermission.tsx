import { ShieldOff } from "lucide-react";
import { Outlet } from "react-router-dom";

import type { Permission } from "../api/auth";
import { useAuth } from "./useAuth";

/** A screen this admin's role doesn't include: say so instead of letting every call answer 403. */
export function RequirePermission({ permission }: { permission: Permission }) {
  const { can } = useAuth();
  if (can(permission)) return <Outlet />;
  return (
    <div className="page-container">
      <div className="surface flex flex-col items-center px-6 py-14 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-secondary-light)] text-[var(--color-danger)]">
          <ShieldOff size={18} />
        </div>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">You don't have access to this</p>
        <p className="mt-1 max-w-sm text-sm text-[var(--color-text-secondary)]">
          Your role doesn't include this screen. Ask a super admin if you need it.
        </p>
      </div>
    </div>
  );
}
