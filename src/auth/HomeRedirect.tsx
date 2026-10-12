import { Navigate } from "react-router-dom";

import { navigation } from "../components/layout/navigation";
import { useAuth } from "./useAuth";

/** The first screen this admin may open (e.g. a sales rep lands on the sales audit). */
export function HomeRedirect() {
  const { can } = useAuth();
  const first = navigation.find((item) => can(item.permission));
  return <Navigate to={first?.to ?? "/account"} replace />;
}
