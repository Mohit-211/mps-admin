import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./useAuth";

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
    </div>
  );
}

/** Signed-in only; otherwise to /login, remembering where the admin was going. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageSpinner />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return <Outlet />;
}

/** Signed-out only (login, forgot password); a signed-in admin goes to the dashboard. */
export function RedirectIfAuthenticated() {
  const { status } = useAuth();

  if (status === "loading") return <FullPageSpinner />;
  if (status === "authenticated") return <Navigate to="/" replace />;
  return <Outlet />;
}
