import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/useAuth";

/**
 * A link to an organization or user page, or plain text for admins without platform.read
 * (e.g. an editor on the support or citations screens), so nobody is sent to a page they can't open.
 */
export function OrgLink({ id, children, className = "" }: { id: string | null | undefined; children: ReactNode; className?: string }) {
  const { can } = useAuth();
  if (!id || !can("platform.read")) return <span className={className}>{children}</span>;
  return (
    <Link
      to={`/organizations/${id}`}
      onClick={(e) => e.stopPropagation()}
      className={`text-[var(--color-primary)] hover:underline ${className}`}
    >
      {children}
    </Link>
  );
}

export function UserLink({ id, children, className = "" }: { id: string | null | undefined; children: ReactNode; className?: string }) {
  const { can } = useAuth();
  if (!id || !can("platform.read")) return <span className={className}>{children}</span>;
  return (
    <Link to={`/users/${id}`} onClick={(e) => e.stopPropagation()} className={`text-[var(--color-primary)] hover:underline ${className}`}>
      {children}
    </Link>
  );
}
