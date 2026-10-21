import { ALL_NAV } from "./nav";

export const FLEET21_MODULES = ALL_NAV.map(({ id, label }) => ({ id, label }));

export const ROLE_ACTIONS = [
  { id: "view", label: "View" },
  { id: "create", label: "Create" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
];

export const emptyMatrix = () =>
  Object.fromEntries(
    FLEET21_MODULES.map((mod) => [
      mod.id,
      { view: false, create: false, edit: false, delete: false },
    ]),
  );

export const mergeMatrix = (extra = {}) => {
  const next = emptyMatrix();
  FLEET21_MODULES.forEach((mod) => {
    next[mod.id] = { ...next[mod.id], ...(extra[mod.id] || {}) };
  });
  return next;
};

export const summariseMatrix = (matrix = {}) => {
  const viewed = FLEET21_MODULES.filter((mod) => matrix[mod.id]?.view).map((m) => m.label);
  if (!viewed.length) return "No access";
  if (viewed.length === FLEET21_MODULES.length) return "All modules";
  return viewed.slice(0, 3).join(" · ") + (viewed.length > 3 ? "…" : "");
};

export const ACCESS_TYPES = [
  { id: "admin", label: "Admin" },
  { id: "fleet_manager", label: "Fleet manager" },
  { id: "driver", label: "Driver" },
  { id: "finance", label: "Finance / read only" },
];

export const canManagePeople = (user) =>
  ["super_admin", "admin", "fleet_manager"].includes(user?.role);

export const can = (user, module, action = "view") => {
  if (!user) return false;
  if (user.role === "super_admin" || user.role_key === "super_admin") return true;
  if (user.permissions?.[module]?.[action]) return true;
  if (module === "brighty-ai") return true;
  if (user.role === "admin" || user.role_key === "admin") return module !== "documents";
  return false;
};

export const moduleFromPath = (pathname) => {
  const hit = ALL_NAV.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  return hit?.id || "";
};
