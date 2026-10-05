import { Navigate, Outlet, useLocation } from "react-router-dom";

import { PageSpinner } from "../components/ui/PageSpinner";
import { useAuth } from "./useAuth";

/** Signed-in only; otherwise to /login, remembering where the admin was going. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <PageSpinner fullScreen />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return <Outlet />;
}

/** Signed-out only (login, forgot password); a signed-in admin goes to the dashboard. */
export function RedirectIfAuthenticated() {
  const { status } = useAuth();

  if (status === "loading") return <PageSpinner fullScreen />;
  if (status === "authenticated") return <Navigate to="/" replace />;
  return <Outlet />;
}
