const MODULES = [
  "dashboard",
  "vehicles",
  "drivers",
  "checkins",
  "reviews",
  "incidents",
  "maintenance",
  "mechanics",
  "documents",
  "companies",
  "settings",
  "roles-rights",
];

const cell = (view, write = false) => ({
  view,
  create: write,
  edit: write,
  delete: write,
});

export const emptyMatrix = () =>
  Object.fromEntries(MODULES.map((id) => [id, cell(false)]));

export const fullMatrix = () =>
  Object.fromEntries(MODULES.map((id) => [id, cell(true, true)]));

export const matrixForKey = (key) => {
  const m = emptyMatrix();
  if (key === "super_admin") return fullMatrix();
  if (key === "admin") {
    MODULES.forEach((id) => {
      m[id] = cell(id !== "documents", id !== "documents");
    });
    return m;
  }
  if (key === "fleet_manager") {
    ["dashboard", "vehicles", "drivers", "checkins", "reviews", "incidents", "maintenance", "mechanics", "settings"].forEach(
      (id) => {
        m[id] = cell(true, id !== "dashboard");
      },
    );
    m.companies = cell(true);
    return m;
  }
  if (key === "driver") {
    m.dashboard = cell(true);
    m.checkins = { view: true, create: true, edit: false, delete: false };
    m.reviews = { view: true, create: true, edit: false, delete: false };
    m.incidents = { view: true, create: true, edit: false, delete: false };
    m.mechanics = cell(true);
    return m;
  }
  if (key === "finance") {
    m.dashboard = cell(true);
    m.vehicles = cell(true);
    m.checkins = cell(true, true);
    m.settings = cell(true);
    return m;
  }
  ["dashboard", "vehicles", "drivers", "checkins", "reviews", "incidents", "maintenance", "mechanics", "settings"].forEach(
    (id) => {
      m[id] = cell(true);
    },
  );
  return m;
};

export const ROLE_TEMPLATES = [
  {
    RoleID: "R001",
    RoleName: "System Administrator",
    key: "admin",
    description: "Full system access and configuration",
    Permissions: "All modules · full CRUD",
    permissionsMatrix: matrixForKey("admin"),
  },
  {
    RoleID: "R002",
    RoleName: "Fleet Manager",
    key: "fleet_manager",
    description: "Manage fleet, assets, maintenance and reports",
    Permissions: "Assets · Check-in · Maintenance",
    permissionsMatrix: matrixForKey("fleet_manager"),
  },
  {
    RoleID: "R003",
    RoleName: "Driver",
    key: "driver",
    description: "Check-in, reviews and assigned vehicle",
    Permissions: "Check-in · Reviews · Checkout",
    permissionsMatrix: matrixForKey("driver"),
  },
  {
    RoleID: "R004",
    RoleName: "Read Only",
    key: "finance",
    description: "View operations without changing records",
    Permissions: "View only",
    permissionsMatrix: matrixForKey("viewer"),
  },
];

export const hasPermission = (user, module, action = "view") => {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return Boolean(user.permissions?.[module]?.[action]);
};

const parseMatrix = (value) => {
  let extra = value;
  if (typeof extra === "string") {
    try {
      extra = JSON.parse(extra);
    } catch {
      extra = {};
    }
  }
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) return {};
  return extra;
};

const mergeMatrix = (extra) => {
  const parsed = parseMatrix(extra);
  if (!Object.keys(parsed).length) return null;
  const next = emptyMatrix();
  MODULES.forEach((id) => {
    next[id] = { ...next[id], ...(parsed[id] || {}) };
  });
  return next;
};

export const resolvePermissions = async (user, db) => {
  if (!user) return { permissions: emptyMatrix(), role_label: "", role_key: "" };
  if (user.role === "super_admin") {
    return { permissions: fullMatrix(), role_label: "Super admin", role_key: "super_admin" };
  }
  const own = user.company_id ? await db.fetchAll("roles", user.company_id) : [];
  const platform = await db.fetchAll("roles", "co-1");
  const pool = [...own, ...platform];
  const row =
    pool.find((role) => role.RoleID === user.role_id || role.id === user.role_id) ||
    pool.find((role) => role.key === user.role && role.company_id === user.company_id) ||
    pool.find((role) => role.key === user.role);
  const key = row?.key || user.role || "driver";
  const permissions = mergeMatrix(row?.permissionsMatrix ?? row?.permissionsmatrix) || matrixForKey(key);
  return {
    permissions: row?.state === "inactive" ? emptyMatrix() : permissions,
    role_label: row?.RoleName || user.role,
    role_key: key,
  };
};
