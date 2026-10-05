import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";

export function AdminLayout() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-shell flex">
      <Sidebar mobileOpen={navOpen} onClose={() => setNavOpen(false)} />

      <div className="app-content flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setNavOpen(true)} />

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
