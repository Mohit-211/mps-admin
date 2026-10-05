import {
  BarChart3,
  Building2,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "../../api/auth";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: Permission;
  /** Screen not built yet: shown greyed out, not clickable. */
  soon?: boolean;
};

// The menu follows GET /admin/auth/me → permissions, never the role name.
export const navigation: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, permission: "platform.read" },
  { label: "Users", to: "/users", icon: Users, permission: "platform.read" },
  { label: "Organizations", to: "/organizations", icon: Building2, permission: "platform.read", soon: true },
  { label: "Citations", to: "/citations", icon: BarChart3, permission: "citations.view", soon: true },
  { label: "Reports", to: "/reports", icon: FileBarChart, permission: "platform.read", soon: true },
  { label: "Billing", to: "/billing", icon: CreditCard, permission: "billing.read", soon: true },
  { label: "Support", to: "/support", icon: LifeBuoy, permission: "support.read", soon: true },
  { label: "Staff", to: "/staff", icon: ShieldCheck, permission: "admins.manage" },
  { label: "Settings", to: "/settings", icon: Settings, soon: true },
];
