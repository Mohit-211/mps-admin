import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { PageSpinner } from "../components/ui/PageSpinner";
import { DiscoveryRunsProvider } from "../pages/citations/DiscoveryRuns";

export function AdminLayout() {
  const [navOpen, setNavOpen] = useState(false);

  // Directory-discovery searches run in the background; polling here keeps going while the admin works elsewhere.
  return (
    <DiscoveryRunsProvider>
    <div className="app-shell flex">
      <Sidebar mobileOpen={navOpen} onClose={() => setNavOpen(false)} />

      <div className="app-content flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setNavOpen(true)} />

        <main className="min-w-0 flex-1">
          {/* Keeps the sidebar and top bar on screen while a page's chunk loads. */}
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
    </DiscoveryRunsProvider>
  );
}
