import { Navigate } from "react-router-dom";

import { navigation } from "../components/layout/navigation";
import { useAuth } from "./useAuth";

/** The first screen this admin may open (e.g. a sales rep has no Dashboard). */
export function HomeRedirect() {
  const { can } = useAuth();
  const first = navigation.find((item) => !item.soon && (!item.permission || can(item.permission)));
  if (!first) return <NoAccess />;
  return <Navigate to={first.to} replace />;
}

function NoAccess() {
  return (
    <div className="page-container">
      <div className="surface px-6 py-14 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Nothing to show yet</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Your role doesn't include any of the screens built so far. Ask a super admin if you think this is wrong.
        </p>
      </div>
    </div>
  );
}
