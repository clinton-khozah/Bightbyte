export const OPERATIONS_NAV = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: "grid" },
  { id: "vehicles", label: "Vehicles", path: "/vehicles", icon: "truck" },
  { id: "drivers", label: "User Management", path: "/drivers", icon: "users" },
  { id: "checkins", label: "Check-in", path: "/checkins", icon: "cash", badge: "LIVE", badgeTone: "green" },
  { id: "reviews", label: "Car reviews", path: "/reviews", icon: "camera" },
  { id: "incidents", label: "Incidents", path: "/incidents", icon: "alert", badge: "OPEN", badgeTone: "amber" },
  { id: "maintenance", label: "Service", path: "/maintenance", icon: "wrench" },
  { id: "mechanics", label: "Mechanics", path: "/mechanics", icon: "mechanic" },
  { id: "documents", label: "Documents", path: "/documents", icon: "folder" },
];

export const ADMIN_NAV = [
  { id: "companies", label: "Companies", path: "/companies", icon: "building" },
  { id: "settings", label: "Settings", path: "/settings", icon: "settings" },
  { id: "roles-rights", label: "Roles & Rights", path: "/roles-rights", icon: "shield" },
];

export const ALL_NAV = [...OPERATIONS_NAV, ...ADMIN_NAV];

export const titleFromPath = (pathname) =>
  ALL_NAV.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    ?.label || "Fleet21";
