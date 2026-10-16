import {
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  LifeBuoy,
  ScanSearch,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "../../api/auth";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  permission: Permission;
};

// The menu follows GET /admin/auth/me → permissions, never the role name.
// A sales representative (audits.run + leads.read) sees only Sales audit and Leads.
export const navigation: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, permission: "platform.read" },
  { label: "Organizations", to: "/organizations", icon: Building2, permission: "platform.read" },
  { label: "Users", to: "/users", icon: Users, permission: "platform.read" },
  { label: "Reports", to: "/reports", icon: FileBarChart, permission: "platform.read" },
  { label: "Billing", to: "/billing", icon: CreditCard, permission: "billing.read" },
  { label: "Support", to: "/support", icon: LifeBuoy, permission: "support.read" },
  { label: "Citations", to: "/citations", icon: BarChart3, permission: "citations.view" },
  { label: "Sales audit", to: "/sales-audit", icon: ScanSearch, permission: "audits.run" },
  { label: "Free-audit leads", to: "/leads", icon: ClipboardList, permission: "leads.read" },
  { label: "Staff", to: "/staff", icon: ShieldCheck, permission: "admins.manage" },
  { label: "Master settings", to: "/master-settings", icon: SlidersHorizontal, permission: "settings.master" },
];
