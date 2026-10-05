export const dashboardStats = [
  {
    label: "Total Users",
    value: "2,847",
    change: "+8.4%",
    trend: "up" as const,
  },
  {
    label: "Organizations",
    value: "1,126",
    change: "+6.2%",
    trend: "up" as const,
  },
  {
    label: "Active Subscriptions",
    value: "914",
    change: "+4.8%",
    trend: "up" as const,
  },
  {
    label: "Reports Generated",
    value: "18,492",
    change: "+12.7%",
    trend: "up" as const,
  },
];

export const userGrowth = [
  { month: "Apr", users: 1980 },
  { month: "May", users: 2115 },
  { month: "Jun", users: 2260 },
  { month: "Jul", users: 2418 },
  { month: "Aug", users: 2630 },
  { month: "Sep", users: 2847 },
];

export const subscriptionBreakdown = [
  { name: "Standard", value: 612 },
  { name: "Custom", value: 182 },
  { name: "Trial", value: 120 },
];

export const recentRegistrations = [
  {
    name: "Northstar Dental Group",
    type: "Business",
    owner: "Alicia Morgan",
    joined: "Today, 10:42 AM",
  },
  {
    name: "BrightPath Marketing",
    type: "Agency",
    owner: "Daniel Foster",
    joined: "Today, 09:18 AM",
  },
  {
    name: "Harbor Physio",
    type: "Business",
    owner: "Maya Thompson",
    joined: "Yesterday, 04:31 PM",
  },
  {
    name: "Local Growth Partners",
    type: "Agency",
    owner: "Ryan Cooper",
    joined: "Yesterday, 01:07 PM",
  },
];

export const recentActivity = [
  {
    action: "Organization created",
    subject: "Northstar Dental Group",
    time: "12 min ago",
  },
  {
    action: "Report generated",
    subject: "GBP Audit — Harbor Physio",
    time: "28 min ago",
  },
  {
    action: "Subscription activated",
    subject: "BrightPath Marketing",
    time: "46 min ago",
  },
  {
    action: "User account disabled",
    subject: "jordan@example.com",
    time: "1 hr ago",
  },
];
