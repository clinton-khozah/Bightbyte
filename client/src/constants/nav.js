export const OPERATIONS_NAV = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: "grid" },
  { id: "vehicles", label: "Vehicles", path: "/vehicles", icon: "truck" },
  { id: "drivers", label: "User Management", path: "/drivers", icon: "users" },
  { id: "checkins", label: "Check-in", path: "/checkins", icon: "cash" },
  { id: "reviews", label: "Car reviews", path: "/reviews", icon: "camera" },
  { id: "incidents", label: "Incidents", path: "/incidents", icon: "alert" },
  { id: "maintenance", label: "Service", path: "/maintenance", icon: "wrench" },
  { id: "mechanics", label: "Mechanics", path: "/mechanics", icon: "mechanic" },
  { id: "documents", label: "Documents", path: "/documents", icon: "folder" },
  { id: "brighty-ai", label: "Brighty AI", path: "/brighty-ai", icon: "brighty" },
];

export const ADMIN_NAV = [
  { id: "companies", label: "Companies", path: "/companies", icon: "building" },
  { id: "settings", label: "Settings", path: "/settings", icon: "settings" },
  { id: "roles-rights", label: "Roles & Rights", path: "/roles-rights", icon: "shield" },
];

export const ALL_NAV = [...OPERATIONS_NAV, ...ADMIN_NAV];

export const navItemForUser = (item, user) =>
  item.id === "drivers" && user?.role === "driver" ? { ...item, label: "My Profile" } : item;

export const titleFromPath = (pathname, user) => {
  const item = ALL_NAV.find((row) => pathname === row.path || pathname.startsWith(`${row.path}/`));
  if (!item) return "Fleet21";
  return navItemForUser(item, user).label;
};
