import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { moduleDir } from "./moduleDir.js";
import multer from "multer";
import { config, useSupabase } from "./config.js";
import { db } from "./store.js";
import { normalizeEmail, requireAuth, requirePermission, requireRole, signToken, verifyPassword } from "./auth.js";
import { hasPermission, resolvePermissions, ROLE_TEMPLATES } from "./permissions.js";
import {
  evaluateAllCompanyServices,
  evaluateCompanyServices,
  evaluateWorkspaceServices,
  companyIdsForUser,
  listDecoratedServices,
  syncVehicleOdometer,
} from "./serviceDue.js";
import { notifyCheckinSuccess, notifyCompanyApproved, notifyCompanySubmitted, notifyInvite, runMissedCheckinMails } from "./mail.js";
import { signInAuth, upsertAuthUser } from "./supabaseAuth.js";
import { dueAtForSchedule, dueAtToday, parseDueWeekday, zaDay } from "./zaTime.js";

const __dirname = moduleDir(import.meta.url);
const onLambda = Boolean(process.env.LAMBDA_TASK_ROOT || process.env.NETLIFY);
const uploadDir = onLambda ? path.join("/tmp", "fleet21-uploads") : path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || "file").replace(/[^\w.-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 12 * 1024 * 1024 } });

const app = express();
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: "8mb" }));
app.use("/uploads", express.static(uploadDir));

const fileUrl = (req, filename) =>
  `${req.protocol}://${req.get("host")}/uploads/${filename}`;

const companyStatusOf = (row) => String(row?.status || "").trim().toLowerCase();

const isAwaitingCompanyApproval = (company, person) => {
  const companyStatus = companyStatusOf(company);
  if (companyStatus === "active" || companyStatus === "approved") return false;
  if (companyStatus === "pending" || companyStatus === "submitted") return true;
  return !company && companyStatusOf(person) === "pending";
};

const ROLE_IDS = { super_admin: "R000", admin: "R001", fleet_manager: "R002", driver: "R003" };
const ROLE_LABELS = {
  super_admin: "Super admin",
  admin: "Admin",
  fleet_manager: "Fleet manager",
  driver: "Driver",
  finance: "Finance",
};

const sessionUser = async (user) => {
  const pub = db.publicUser(user);
  const company = user.company_id ? await db.getById("companies", user.company_id) : null;
  const isSuper = pub.role === "super_admin";
  const extra = await resolvePermissions(pub, db);
  return {
    ...pub,
    ...extra,
    company_name: isSuper ? company?.name || "BrightByte" : company?.name || "",
    role_id: isSuper ? ROLE_IDS.super_admin : pub.role_id || ROLE_IDS[pub.role] || "R004",
    role_label: extra.role_label || ROLE_LABELS[pub.role] || pub.role,
  };
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mode: useSupabase ? "supabase" : "local" });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "").trim();
    if (!email || !password) {
      return res.status(401).json({ error: "Enter your email and password." });
    }
    const auth = useSupabase ? await signInAuth(email, password) : { ok: false };
    let user = await db.findUserByEmail(email);
    if (!user && auth.ok && auth.user?.id) {
      user = await db.getUser(auth.user.id);
    }
    if (!user) {
      return res.status(401).json({ error: "No account for that email. Use the email address from your invite." });
    }
    if (useSupabase) {
      if (!auth.ok && !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: "Wrong password" });
      }
    } else if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Wrong password" });
    }
    const company = user.company_id ? await db.getById("companies", user.company_id) : null;
    if (isAwaitingCompanyApproval(company, user)) {
      return res.status(403).json({
        error: "This company has been submitted. Wait for a super admin to approve it.",
      });
    }
    res.json({ token: signToken(user), user: await sessionUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { companyName, fullName, email, password, companyAddress } = req.body || {};
    if (!companyName || !fullName || !email || !password || !companyAddress) {
      return res.status(400).json({ error: "Missing registration fields" });
    }
    const existing = await db.findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already in use" });
    const { company, user } = await db.registerCompany({
      companyName,
      fullName,
      email: normalizeEmail(email),
      password,
      address: String(companyAddress).trim(),
      role: "admin",
    });
    await notifyCompanySubmitted({ company, applicant: user });
    res.json({
      pending: true,
      message: "Company has been successfully submitted. Wait for approval.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/me", requireAuth, async (req, res) => {
  await evaluateWorkspaceServices(req.user).catch(() => {});
  const full = await db.getUser(req.user.id);
  const company = full?.company_id ? await db.getById("companies", full.company_id) : null;
  if (isAwaitingCompanyApproval(company, full)) {
    return res.status(403).json({
      error: "This company has been submitted. Wait for a super admin to approve it.",
    });
  }
  res.json({ user: await sessionUser(full || req.user), mode: useSupabase ? "supabase" : "local" });
});

app.get("/api/company", requireAuth, async (req, res) => {
  const company = await db.getById("companies", req.user.company_id);
  if (!company) return res.status(404).json({ error: "Company not found" });
  res.json(company);
});

app.patch("/api/me", requireAuth, async (req, res) => {
  try {
    const allowed = [
      "photo_url",
      "phone",
      "address",
      "full_name",
      "id_number",
    ];
    const patch = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    });
    const row = await db.update("profiles", req.user.id, patch);
    res.json({ user: await sessionUser(row) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/uploads", requireAuth, upload.array("files", 12), (req, res) => {
  const urls = (req.files || []).map((file) => fileUrl(req, file.filename));
  res.json({ urls });
});

const skipSeedRow = (row) =>
  Boolean(row?.demo) ||
  ["v-1", "v-2", "v-3", "c-1", "c-2", "c-3", "ex-1", "ex-2", "r-1", "r-2", "i-1", "m-1"].includes(row?.id);

const workspaceRows = async (table, user) => {
  if (user.role === "super_admin") {
    const companies = (await db.fetchAll("companies")).filter((company) => !company.demo);
    const packs = await Promise.all(companies.map((company) => db.fetchAll(table, company.id)));
    return packs.flat().filter((row) => !skipSeedRow(row) && row?.id !== "u-admin" && row?.id !== "u-driver");
  }
  return (await db.fetchAll(table, user.company_id)).filter(
    (row) => !skipSeedRow(row) && row?.id !== "u-admin" && row?.id !== "u-driver",
  );
};

app.get("/api/dashboard", requireAuth, async (req, res) => {
  try {
    await evaluateWorkspaceServices(req.user).catch(() => {});
    const [vehicles, checkins, reviews, incidents, expenses, drivers] = await Promise.all([
      workspaceRows("vehicles", req.user),
      workspaceRows("checkins", req.user),
      workspaceRows("reviews", req.user),
      workspaceRows("incidents", req.user),
      workspaceRows("expenses", req.user),
      workspaceRows("profiles", req.user),
    ]);
    const mine = req.user.role === "driver";
    const driverId = req.user.id;
    const me = drivers.find((row) => row.id === driverId);
    const liveVehicles = vehicles.filter((row) => !isDemoVehicle(row));
    const assignedVehicles = mine
      ? liveVehicles.filter(
          (row) => row.assigned_driver_id === driverId || me?.assigned_vehicle_id === row.id,
        )
      : liveVehicles;
    const filterMine = (rows, key = "driver_id") =>
      mine ? rows.filter((r) => r[key] === driverId || r.logged_by === driverId) : rows;
    const mineCheckins = filterMine(checkins);
    const mineExpenses = filterMine(expenses);
    const mineReviews = filterMine(reviews);
    const mineIncidents = filterMine(incidents, "driver_id");
    const checkinTotal = mineCheckins.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const expenseTotal = mineExpenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const monthKey = (value) => {
      const d = new Date(value);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    const sumByMonth = (rows) => {
      const map = {};
      rows.forEach((row) => {
        const key = monthKey(row.created_at);
        map[key] = (map[key] || 0) + Number(row.amount || 0);
      });
      return map;
    };
    const incomeByMonth = sumByMonth(mineCheckins);
    const expenseByMonth = sumByMonth(mineExpenses);
    const now = new Date();
    const financeMonths = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const income = Number(incomeByMonth[key] || 0);
      const expense = Number(expenseByMonth[key] || 0);
      financeMonths.push({
        key,
        label: d.toLocaleString("en-ZA", { month: "short" }),
        total: income,
        expense,
        profit: income - expense,
      });
    }
    const servicesDue = (await listDecoratedServices(req.user)).filter(
      (row) =>
        row.due &&
        (!mine || assignedVehicles.some((vehicle) => vehicle.id === row.vehicle_id)),
    );
    const financeTotals = {
      total: checkinTotal,
      expense: expenseTotal,
      profit: checkinTotal - expenseTotal,
    };
    const assignedVehicle = assignedVehicles[0] || null;
    const vehicleLabel = (id) =>
      assignedVehicles.find((row) => row.id === id)?.registration ||
      liveVehicles.find((row) => row.id === id)?.registration ||
      "";
    res.json({
      viewer: mine ? "driver" : "ops",
      vehicles: mine ? assignedVehicles : vehicles,
      assignedVehicle: assignedVehicle ? publicVehicle(req.user, assignedVehicle) : null,
      drivers: drivers.filter((p) => p.role === "driver"),
      checkins: mineCheckins,
      reviews: mineReviews,
      incidents: mineIncidents,
      expenses: mine ? [] : mineExpenses,
      finance: mine ? { months: [], totals: { total: 0, expense: 0, profit: 0 } } : { months: financeMonths, totals: financeTotals },
      recentCheckins: mineCheckins
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
        .map((row) => ({
          id: row.id,
          created_at: row.created_at,
          status: row.status,
          vehicle_id: row.vehicle_id,
          registration: vehicleLabel(row.vehicle_id),
        })),
      servicesDue,
      kpis: {
        vehicles: assignedVehicles.length,
        inUse: assignedVehicles.filter((v) => v.status === "in_use").length,
        checkins: mineCheckins.length,
        reviews: mineReviews.length,
        checkinTotal: mine ? 0 : checkinTotal,
        revenue: mine ? 0 : financeTotals.profit,
        expenseTotal: mine ? 0 : expenseTotal,
        profitTotal: mine ? 0 : financeTotals.profit,
        servicesDue: servicesDue.length,
        openIncidents: mineIncidents.filter((i) => i.status === "open").length,
        pendingReviews: mineReviews.filter((r) => r.status === "submitted").length,
      },
      pendingCompanies:
        req.user.role === "super_admin"
          ? (await db.fetchAll("companies")).filter((row) => row.status === "pending" && !row.demo)
          : [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const listRoute = (table) => async (req, res) => {
  try {
    const companyQuery =
      req.user.role === "super_admin" && req.query.company_id ? String(req.query.company_id) : "";
    let rows;
    if (["checkins", "expenses", "reviews", "incidents", "mechanics", "documents"].includes(table) && req.user.role === "super_admin" && !companyQuery) {
      const companies = (await db.fetchAll("companies")).filter((company) => !company.demo);
      const packs = await Promise.all(companies.map((company) => db.fetchAll(table, company.id)));
      rows = packs.flat();
    } else {
      rows = await db.fetchAll(table, companyQuery || req.user.company_id);
    }
    if (table === "mechanics") {
      rows = rows.filter((row) => !row.demo && !["mech-1", "mech-2"].includes(row.id));
    }
    if (table === "supplies") {
      rows = rows.filter((row) => !row.demo && !["s-1", "s-2", "s-3"].includes(row.id));
    }
    if (table === "checkins") {
      rows = rows.filter((row) => !row.demo && !["c-1", "c-2", "c-3"].includes(row.id));
    }
    if (table === "expenses") {
      rows = rows.filter((row) => !row.demo && !["ex-1", "ex-2"].includes(row.id));
    }
    if (table === "reviews") {
      rows = rows.filter((row) => !row.demo && !["r-1", "r-2"].includes(row.id));
    }
    if (table === "incidents") {
      rows = rows.filter((row) => !row.demo && row.id !== "i-1");
    }
    if (table === "documents") {
      rows = rows.filter((row) => !row.demo && !["d-1", "d-2", "d-3", "d-4", "d-5"].includes(row.id));
    }
    if ((req.user.role === "driver" || req.user.role_key === "driver") && ["checkins", "reviews", "checkouts", "incidents", "refuels", "expenses"].includes(table)) {
      rows = rows.filter((row) => String(row.driver_id) === String(req.user.id) || String(row.logged_by) === String(req.user.id));
    }
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

app.get("/api/vehicles", requireAuth, async (req, res) => {
  try {
    const companyId = req.query.company_id ? String(req.query.company_id) : "";
    const rows = await listWorkspaceVehicles(req.user, companyId || null);
    const companies = await db.fetchAll("companies");
    res.json(
      rows.map((row) =>
        publicVehicle(req.user, row, {
          company_name: companies.find((company) => company.id === row.company_id)?.name || "",
        }),
      ),
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
const mapUser = (p, vehicles = []) => {
  const assigned = vehicles.find((v) => v.assigned_driver_id === p.id);
  return {
    ...db.publicUser(p),
    assigned_vehicle_id: assigned?.id || p.assigned_vehicle_id || null,
  };
};

const isDemoProfile = (row) => Boolean(row?.demo) || row?.id === "u-admin" || row?.id === "u-driver";
const isDemoVehicle = (row) => Boolean(row?.demo) || ["v-1", "v-2", "v-3"].includes(row?.id);
const canListCompanyPeople = (user) =>
  ["super_admin", "admin", "fleet_manager"].includes(user.role);
const publicVehicle = (user, row, extras = {}) => {
  const next = { ...row, ...extras };
  if (user.role === "driver" || user.role_key === "driver") delete next.value;
  return next;
};

const companyScopeOk = (user, companyId) =>
  user.role === "super_admin" || user.company_id === companyId;

const listWorkspacePeople = async (user) => {
  if (!canListCompanyPeople(user)) {
    const [people, vehicles] = await Promise.all([
      db.fetchAll("profiles", user.company_id),
      db.fetchAll("vehicles", user.company_id),
    ]);
    const me = people.find((row) => row.id === user.id);
    return {
      people: people.filter((row) => row.id === user.id && !isDemoProfile(row)),
      vehicles: vehicles.filter(
        (row) =>
          !isDemoVehicle(row) &&
          (row.assigned_driver_id === user.id || me?.assigned_vehicle_id === row.id),
      ),
    };
  }
  if (user.role === "super_admin") {
    const companies = (await db.fetchAll("companies")).filter((company) => !company.demo);
    const packs = await Promise.all(
      companies.map(async (company) => {
        const [people, fleet] = await Promise.all([
          db.fetchAll("profiles", company.id),
          db.fetchAll("vehicles", company.id),
        ]);
        return {
          people: people.filter((row) => !isDemoProfile(row)),
          fleet: fleet.filter((row) => !isDemoVehicle(row)),
        };
      }),
    );
    return {
      people: packs.flatMap((pack) => pack.people),
      vehicles: packs.flatMap((pack) => pack.fleet),
    };
  }
  const [people, vehicles] = await Promise.all([
    db.fetchAll("profiles", user.company_id),
    db.fetchAll("vehicles", user.company_id),
  ]);
  return {
    people: people.filter((row) => !isDemoProfile(row)),
    vehicles: vehicles.filter((row) => !isDemoVehicle(row)),
  };
};

const listWorkspaceVehicles = async (user, companyId) => {
  if (user.role === "driver") {
    const { vehicles } = await listWorkspacePeople(user);
    return vehicles;
  }
  if (companyId) {
    if (!companyScopeOk(user, companyId)) return [];
    return (await db.fetchAll("vehicles", companyId)).filter((row) => !isDemoVehicle(row));
  }
  const { vehicles } = await listWorkspacePeople(user);
  return vehicles;
};

const isDemoSchedule = (row) => Boolean(row?.demo) || row?.id === "sch-1";

const listWorkspaceSchedules = async (user) => {
  if (user.role === "super_admin") {
    const companies = (await db.fetchAll("companies")).filter((company) => !company.demo);
    const packs = await Promise.all(companies.map((company) => db.fetchAll("checkin_schedules", company.id)));
    return packs.flat().filter((row) => !isDemoSchedule(row));
  }
  return (await db.fetchAll("checkin_schedules", user.company_id)).filter((row) => !isDemoSchedule(row));
};

const fail = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const resolveTenantCompany = async (user, { driverId, vehicleId }) => {
  const vehicle = vehicleId ? await db.getById("vehicles", vehicleId) : null;
  const driver = driverId ? await db.getUser(driverId) : null;
  if (vehicleId && (!vehicle || isDemoVehicle(vehicle))) throw fail(400, "Select a vehicle");
  if (driverId && (!driver || isDemoProfile(driver))) throw fail(400, "Select a driver");
  const companyId = vehicle?.company_id || driver?.company_id;
  if (!companyId) throw fail(400, "Select a driver and vehicle");
  if (!companyScopeOk(user, companyId)) throw fail(403, "Not allowed for this company");
  if (vehicle && driver && vehicle.company_id !== driver.company_id) {
    throw fail(400, "Driver and vehicle must belong to the same company");
  }
  if (vehicle && driverId) {
    const assigned =
      vehicle.assigned_driver_id === driverId || driver?.assigned_vehicle_id === vehicle.id;
    if (!assigned) throw fail(400, "Select the vehicle assigned to this driver");
  }
  if (user.role === "driver" && vehicle && vehicle.assigned_driver_id !== user.id && driver?.assigned_vehicle_id !== vehicle.id) {
    throw fail(400, "This vehicle is not assigned to you");
  }
  return { companyId, vehicle, driver };
};

app.get("/api/drivers", requireAuth, async (req, res) => {
  const { people, vehicles } = await listWorkspacePeople(req.user);
  res.json(people.filter((p) => p.role === "driver").map((p) => mapUser(p, vehicles)));
});

app.get("/api/users", requireAuth, requirePermission("drivers", "view"), async (req, res) => {
  const { people, vehicles } = await listWorkspacePeople(req.user);
  res.json(people.map((p) => mapUser(p, vehicles)));
});

app.get("/api/users/:id", requireAuth, async (req, res) => {
  const self = req.params.id === req.user.id;
  if (!self && !hasPermission(req.user, "drivers", "view")) {
    return res.status(403).json({ error: "Not allowed for this role" });
  }
  if (!canListCompanyPeople(req.user) && !self) {
    return res.status(404).json({ error: "User not found" });
  }
  const row = await db.getById("profiles", req.params.id);
  if (!row) return res.status(404).json({ error: "User not found" });
  const vehicles = await db.fetchAll("vehicles", row.company_id);
  res.json(mapUser(row, vehicles));
});

app.patch("/api/users/:id", requireAuth, requirePermission("drivers", "edit"), async (req, res) => {
  try {
    const existing = await db.getById("profiles", req.params.id);
    if (!existing) return res.status(404).json({ error: "User not found" });
    if (!canListCompanyPeople(req.user) && req.params.id !== req.user.id) {
      return res.status(404).json({ error: "User not found" });
    }
    if (req.user.role !== "super_admin" && existing.company_id !== req.user.company_id) {
      return res.status(404).json({ error: "User not found" });
    }
    if (isDemoProfile(existing) && req.user.role !== "super_admin") {
      return res.status(404).json({ error: "User not found" });
    }
    const allowed = {};
    [
      "full_name",
      "email",
      "phone",
      "role",
      "role_id",
      "status",
      "photo_url",
      "documents",
      "address",
      "id_number",
      "employee_id",
      "license_no",
      "license_expiry",
      "license_codes",
      "prdp",
      "company_id",
      "start_date",
      "emergency_contact_name",
      "emergency_contact_number",
      "ratings",
    ].forEach((key) => {
      if (req.body[key] !== undefined) allowed[key] = req.body[key];
    });
    if (!canListCompanyPeople(req.user)) {
      ["role", "role_id", "company_id", "status", "employee_id"].forEach((key) => {
        delete allowed[key];
      });
    }
    const nextPassword = String(req.body.password || req.body.new_password || "").trim();
    if (nextPassword) {
      if (nextPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const bcrypt = (await import("bcryptjs")).default;
      allowed.password_hash = bcrypt.hashSync(nextPassword, 10);
      await upsertAuthUser({
        email: normalizeEmail(allowed.email || existing.email),
        password: nextPassword,
        fullName: allowed.full_name || existing.full_name,
        userId: existing.id,
      }).catch((error) => console.error("[auth] password", error.message));
    }
    let row = await db.update("profiles", req.params.id, allowed);
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "assigned_vehicle_id")) {
      row = await assignVehicleToDriver(
        existing.company_id,
        req.params.id,
        req.body.assigned_vehicle_id || null,
      );
    }
    res.json(db.publicUser(row));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/users/:id", requireAuth, requirePermission("drivers", "delete"), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }
    const existing = await db.getById("profiles", req.params.id);
    if (!existing) return res.status(404).json({ error: "User not found" });
    if (!canListCompanyPeople(req.user)) {
      return res.status(404).json({ error: "User not found" });
    }
    if (req.user.role !== "super_admin" && existing.company_id !== req.user.company_id) {
      return res.status(404).json({ error: "User not found" });
    }
    if (isDemoProfile(existing) && req.user.role !== "super_admin") {
      return res.status(404).json({ error: "User not found" });
    }
    await assignVehicleToDriver(existing.company_id, existing.id, null);
    await db.remove("profiles", existing.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

const seedRolesForCompany = async (companyId) => {
  if (!companyId) return [];
  let rows = await db.fetchAll("roles", companyId);
  if (rows.length) return rows;
  await Promise.all(
    ROLE_TEMPLATES.map((template) =>
      db.insert("roles", {
        ...template,
        company_id: companyId,
        state: "active",
        isSystem: false,
      }),
    ),
  );
  return db.fetchAll("roles", companyId);
};

const rolesCompanyId = async (user, body = {}) => {
  if (user.role !== "super_admin") return user.company_id;
  if (body.company_id) return body.company_id;
  const ids = await companyIdsForUser(user);
  return ids[0] || user.company_id;
};

const nextRoleCode = (rows) => {
  const max = rows.reduce((n, row) => {
    const match = String(row.RoleID || "").match(/^R(\d+)$/i);
    return match ? Math.max(n, Number(match[1])) : n;
  }, 0);
  return `R${String(max + 1).padStart(3, "0")}`;
};

app.get("/api/roles", requireAuth, async (req, res) => {
  if (!hasPermission(req.user, "roles-rights", "view") && !hasPermission(req.user, "drivers", "view")) {
    return res.status(403).json({ error: "Not allowed for this role" });
  }
  if (req.user.role === "super_admin") {
    const ids = await companyIdsForUser(req.user);
    const packs = await Promise.all(ids.map((id) => seedRolesForCompany(id)));
    return res.json(packs.flat());
  }
  res.json(await seedRolesForCompany(req.user.company_id));
});

app.post("/api/roles", requireAuth, requirePermission("roles-rights", "create"), async (req, res) => {
  try {
    const companyId = await rolesCompanyId(req.user, req.body);
    const existing = await db.fetchAll("roles", companyId);
    const row = await db.insert("roles", {
      company_id: companyId,
      RoleID: req.body.RoleID || nextRoleCode(existing),
      RoleName: req.body.RoleName,
      key: req.body.key || "admin",
      description: req.body.description || "",
      Permissions: req.body.Permissions || "Custom",
      permissionsMatrix: req.body.permissionsMatrix || {},
      state: req.body.state || "active",
      isSystem: false,
    });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/roles/:id", requireAuth, requirePermission("roles-rights", "edit"), async (req, res) => {
  const existing = await db.getById("roles", req.params.id);
  const companyId = await rolesCompanyId(req.user);
  if (!existing || (req.user.role !== "super_admin" && existing.company_id !== companyId)) {
    return res.status(404).json({ error: "Role not found" });
  }
  const patch = { isSystem: false };
  ["RoleName", "description", "key", "state", "Permissions", "permissionsMatrix", "RoleID"].forEach((key) => {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  });
  res.json(await db.update("roles", req.params.id, patch));
});

app.delete("/api/roles/:id", requireAuth, requirePermission("roles-rights", "delete"), async (req, res) => {
  const existing = await db.getById("roles", req.params.id);
  const companyId = await rolesCompanyId(req.user);
  if (!existing || (req.user.role !== "super_admin" && existing.company_id !== companyId)) {
    return res.status(404).json({ error: "Role not found" });
  }
  const people = await db.fetchAll("profiles", existing.company_id);
  if (people.some((person) => person.role_id === existing.RoleID)) {
    return res.status(400).json({ error: "Reassign users before deleting this role." });
  }
  await db.remove("roles", req.params.id);
  res.json({ ok: true });
});
app.get("/api/companies", requireAuth, requirePermission("companies", "view"), async (req, res) => {
  // Tenant list for administration and user onboarding.
  try {
    const companies = (await db.fetchAll("companies")).filter((company) => !company.demo);
    const rows = await Promise.all(
      companies.map(async (company) => {
        const [people, fleet] = await Promise.all([
          db.fetchAll("profiles", company.id),
          db.fetchAll("vehicles", company.id),
        ]);
        return { ...company, user_count: people.length, vehicle_count: fleet.length };
      }),
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/companies", requireAuth, requirePermission("companies", "create"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Company name is required" });
    const row = await db.insert("companies", {
      name,
      code: String(req.body.code || name.slice(0, 3)).toUpperCase(),
      city: req.body.city || "",
      contact_email: req.body.contact_email || "",
      photo_url: req.body.photo_url || "",
      status: req.body.status || "active",
    });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/companies/:id", requireAuth, requirePermission("companies", "edit"), async (req, res) => {
  const existing = await db.getById("companies", req.params.id);
  if (!existing) return res.status(404).json({ error: "Company not found" });
  const patch = { ...(req.body || {}) };
  if (req.user.role !== "super_admin") {
    delete patch.status;
    if (existing.status === "pending") {
      return res.status(403).json({ error: "Only a super admin can change a pending company" });
    }
  }
  res.json(await db.update("companies", req.params.id, patch));
});

app.post("/api/companies/:id/approve", requireAuth, requireRole("super_admin"), async (req, res) => {
  const existing = await db.getById("companies", req.params.id);
  if (!existing) return res.status(404).json({ error: "Company not found" });
  const company = await db.update("companies", req.params.id, { status: "active" });
  const people = await db.fetchAll("profiles", req.params.id);
  const pendingPeople = people.filter((row) => row.status === "pending");
  await Promise.all(pendingPeople.map((row) => db.update("profiles", row.id, { status: "active" })));
  await notifyCompanyApproved({ company, people: pendingPeople.length ? pendingPeople : people });
  res.json(company);
});

app.delete("/api/companies/:id", requireAuth, requirePermission("companies", "delete"), async (req, res) => {
  const existing = await db.getById("companies", req.params.id);
  if (!existing) return res.status(404).json({ error: "Company not found" });
  if (existing.id === req.user.company_id) {
    return res.status(400).json({ error: "You cannot delete the company you are signed into" });
  }
  await db.remove("companies", req.params.id);
  res.json({ ok: true });
});

app.get("/api/checkins", requireAuth, listRoute("checkins"));

const computeLateFee = (schedule, now = new Date()) => {
  if (!schedule || schedule.active === false) return 0;
  return now > dueAtToday(schedule, now) ? Number(schedule.late_fee || 100) : 0;
};

const cashPaid = (row) => {
  const cash = Number(row?.cash_amount);
  if (Number.isFinite(cash) && cash > 0) return cash;
  return Math.max(0, Number(row?.amount || 0) - Number(row?.late_fee_applied || 0));
};

const remainingOnSchedule = async (companyId, driverId, schedule) => {
  const expected = Math.round(Number(schedule?.expected_amount || 0) * 100) / 100;
  if (!schedule || expected <= 0) return { expected: 0, paid: 0, remaining: 0 };
  const dueDay = zaDay(dueAtToday(schedule));
  const rows = await db.fetchAll("checkins", companyId);
  const paid =
    Math.round(
      rows
        .filter(
          (row) =>
            !row.demo &&
            String(row.status || "").toLowerCase() !== "rejected" &&
            String(row.driver_id) === String(driverId) &&
            zaDay(row.created_at) === dueDay,
        )
        .reduce((sum, row) => sum + cashPaid(row), 0) * 100,
    ) / 100;
  return { expected, paid, remaining: Math.round(Math.max(0, expected - paid) * 100) / 100 };
};

const scheduleForDriver = async (companyId, driverId) => {
  const rows = await db.fetchAll("checkin_schedules", companyId);
  return rows.find((s) => !isDemoSchedule(s) && s.driver_id === driverId && s.active !== false) || null;
};

const tickNotifications = async () => {
  await evaluateAllCompanyServices().catch((error) => console.error("[notify] service", error.message));
  await runMissedCheckinMails().catch((error) => console.error("[notify] check-in", error.message));
};

app.get("/api/checkins/:id", requireAuth, async (req, res) => {
  const row = await db.getById("checkins", req.params.id);
  if (!row || row.demo || !companyScopeOk(req.user, row.company_id)) {
    return res.status(404).json({ error: "Check-in not found" });
  }
  if (req.user.role === "driver" && row.driver_id !== req.user.id) {
    return res.status(404).json({ error: "Check-in not found" });
  }
  res.json(row);
});

app.get("/api/checkin-schedules", requireAuth, async (req, res) => {
  try {
    let rows = await listWorkspaceSchedules(req.user);
    if (req.user.role === "driver" || req.user.role_key === "driver") {
      rows = rows.filter((s) => String(s.driver_id) === String(req.user.id));
    }
    const now = new Date();
    const companyIds = [...new Set(rows.map((row) => row.company_id).filter(Boolean))];
    const checkins = (await Promise.all(companyIds.map((id) => db.fetchAll("checkins", id)))).flat();
    res.json(
      rows.map((schedule) => {
        const due = dueAtForSchedule(schedule, checkins, now);
        return {
          ...schedule,
          due_today: due.toISOString(),
          late_fee_now: now > due ? Number(schedule.late_fee || 100) : 0,
        };
      }),
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/checkin-schedules", requireAuth, requirePermission("checkins", "create"), async (req, res) => {
  if (!req.body.driver_id) return res.status(400).json({ error: "Select a driver" });
  const dueWeekday = parseDueWeekday(req.body.due_weekday);
  if (!dueWeekday) return res.status(400).json({ error: "Select a day of the week" });
  try {
    const { companyId } = await resolveTenantCompany(req.user, {
      driverId: req.body.driver_id,
      vehicleId: req.body.vehicle_id || "",
    });
    const row = await db.insert("checkin_schedules", {
      company_id: companyId,
      driver_id: req.body.driver_id,
      vehicle_id: req.body.vehicle_id || null,
      due_weekday: dueWeekday,
      due_time: req.body.due_time || "18:00",
      late_fee: Number(req.body.late_fee) || 100,
      expected_amount: Number(req.body.expected_amount) || 0,
      notify: req.body.notify !== false,
      active: true,
    });
    res.json(row);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.patch("/api/checkin-schedules/:id", requireAuth, requirePermission("checkins", "edit"), async (req, res) => {
  const existing = await db.getById("checkin_schedules", req.params.id);
  if (!existing || isDemoSchedule(existing) || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Schedule not found" });
  }
  if (!req.body.driver_id) return res.status(400).json({ error: "Select a driver" });
  const dueWeekday = parseDueWeekday(req.body.due_weekday) || parseDueWeekday(existing.due_weekday);
  if (!dueWeekday) return res.status(400).json({ error: "Select a day of the week" });
  try {
    const { companyId } = await resolveTenantCompany(req.user, {
      driverId: req.body.driver_id,
      vehicleId: req.body.vehicle_id || "",
    });
    const row = await db.update("checkin_schedules", req.params.id, {
      company_id: companyId,
      driver_id: req.body.driver_id,
      vehicle_id: req.body.vehicle_id || null,
      due_weekday: dueWeekday,
      due_time: req.body.due_time || existing.due_time || "18:00",
      late_fee: Number(req.body.late_fee) || 0,
      expected_amount: Number(req.body.expected_amount) || 0,
      notify: req.body.notify !== false,
    });
    res.json(row);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.delete("/api/checkin-schedules/:id", requireAuth, requirePermission("checkins", "delete"), async (req, res) => {
  const existing = await db.getById("checkin_schedules", req.params.id);
  if (!existing || isDemoSchedule(existing) || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Schedule not found" });
  }
  await db.remove("checkin_schedules", req.params.id);
  res.json({ ok: true });
});

app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    await evaluateWorkspaceServices(req.user).catch(() => {});
    await runMissedCheckinMails().catch(() => {});
    const rows = (await db.fetchAll("notifications", req.user.company_id)).filter(
      (n) => n.user_id === req.user.id,
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/notifications/:id", requireAuth, async (req, res) => {
  const existing = await db.getById("notifications", req.params.id);
  if (!existing || existing.user_id !== req.user.id) {
    return res.status(404).json({ error: "Notification not found" });
  }
  res.json(await db.update("notifications", req.params.id, { read: true }));
});
app.get("/api/reviews", requireAuth, listRoute("reviews"));

app.get("/api/reviews/:id", requireAuth, async (req, res) => {
  const row = await db.getById("reviews", req.params.id);
  if (!row || row.demo || !companyScopeOk(req.user, row.company_id)) {
    return res.status(404).json({ error: "Review not found" });
  }
  if (req.user.role === "driver" && row.driver_id !== req.user.id) {
    return res.status(404).json({ error: "Review not found" });
  }
  res.json(row);
});
app.get("/api/checkouts", requireAuth, listRoute("checkouts"));
app.get("/api/incidents", requireAuth, listRoute("incidents"));
app.get("/api/incidents/:id", requireAuth, async (req, res) => {
  const row = await db.getById("incidents", req.params.id);
  if (!row || row.demo || !companyScopeOk(req.user, row.company_id)) {
    return res.status(404).json({ error: "Incident not found" });
  }
  if (req.user.role === "driver" && row.driver_id !== req.user.id && row.logged_by !== req.user.id) {
    return res.status(404).json({ error: "Incident not found" });
  }
  res.json(row);
});
app.get("/api/maintenance", requireAuth, requirePermission("maintenance", "view"), async (req, res) => {
  try {
    await evaluateWorkspaceServices(req.user);
    let list = await listDecoratedServices(req.user);
    if (req.user.role === "driver") {
      const mine = (await listWorkspaceVehicles(req.user, null)).map((v) => v.id);
      list = list.filter((row) => mine.includes(row.vehicle_id));
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/documents", requireAuth, requirePermission("documents", "view"), listRoute("documents"));
app.get("/api/documents/:id/file", requireAuth, requirePermission("documents", "view"), async (req, res) => {
  const row = await db.getById("documents", req.params.id);
  if (!row || row.demo || ["d-1", "d-2", "d-3", "d-4", "d-5"].includes(row.id)) {
    return res.status(404).json({ error: "Document not found" });
  }
  const match = String(row.file_url || "").match(/\/uploads\/([^/?#]+)/);
  if (!match) return res.status(404).json({ error: "File not found" });
  const root = path.resolve(uploadDir);
  const filePath = path.resolve(root, path.basename(decodeURIComponent(match[1])));
  if (!filePath.startsWith(root) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  res.sendFile(filePath);
});
app.get("/api/refuels", requireAuth, listRoute("refuels"));
app.get("/api/supplies", requireAuth, listRoute("supplies"));
app.get("/api/mechanics", requireAuth, listRoute("mechanics"));

app.get("/api/vehicle-makes", requireAuth, async (_req, res) => {
  try {
    res.json(await db.listCatalog("vehicle_makes"));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/vehicle-models", requireAuth, async (req, res) => {
  try {
    res.json(await db.listCatalog("vehicle_models", req.query.make || ""));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/vehicle-years", requireAuth, async (_req, res) => {
  try {
    res.json(await db.listCatalog("vehicle_years"));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/vehicles/:id", requireAuth, async (req, res) => {
  const row = await db.getById("vehicles", req.params.id);
  if (!row || isDemoVehicle(row) || !companyScopeOk(req.user, row.company_id)) {
    return res.status(404).json({ error: "Vehicle not found" });
  }
  if (req.user.role === "driver") {
    const allowed = await listWorkspaceVehicles(req.user);
    if (!allowed.some((vehicle) => vehicle.id === row.id)) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
  }
  res.json(publicVehicle(req.user, row));
});

app.post("/api/vehicles", requireAuth, requirePermission("vehicles", "create"), async (req, res) => {
  try {
    const companyId = req.body.company_id || req.user.company_id;
    const company = await db.getById("companies", companyId);
    if (!company || company.demo) return res.status(400).json({ error: "Select a valid company" });
    if (!companyScopeOk(req.user, company.id)) return res.status(403).json({ error: "Not allowed for this company" });
    const registration = String(req.body.registration || "").trim();
    if (!registration) return res.status(400).json({ error: "Registration is required" });
    const photos = Array.isArray(req.body.photos) ? req.body.photos : [];
    if (photos.length < 5) return res.status(400).json({ error: "Upload at least five vehicle photos" });
    const row = await db.insert("vehicles", {
      company_id: company.id,
      registration: req.body.registration,
      make: req.body.make,
      model: req.body.model,
      year: Number(req.body.year) || null,
      vin: req.body.vin || "",
      colour: req.body.colour || "",
      fuel_type: req.body.fuel_type || "",
      engine: req.body.engine || "",
      licence_expiry: req.body.licence_expiry || "",
      status: req.body.status || "available",
      odometer: Number(req.body.odometer) || 0,
      value: Number(req.body.value) || 0,
      assigned_driver_id: req.body.assigned_driver_id || null,
      photo_url: req.body.photo_url || photos[0] || "",
      photos,
      documents: Array.isArray(req.body.documents) ? req.body.documents : [],
    });
    await evaluateCompanyServices(company.id);
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/vehicles/:id", requireAuth, requirePermission("vehicles", "edit"), async (req, res) => {
  const existing = await db.getById("vehicles", req.params.id);
  if (!existing || isDemoVehicle(existing) || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Vehicle not found" });
  }
  const patch = { ...(req.body || {}) };
  delete patch.id;
  if (req.user.role !== "super_admin") delete patch.company_id;
  if (Array.isArray(patch.photos) && patch.photos.length < 5) {
    return res.status(400).json({ error: "Upload at least five vehicle photos" });
  }
  const row = await db.update("vehicles", req.params.id, patch);
  if (patch.odometer !== undefined) await evaluateCompanyServices(row.company_id);
  res.json(row);
});

app.delete("/api/vehicles/:id", requireAuth, requirePermission("vehicles", "delete"), async (req, res) => {
  const existing = await db.getById("vehicles", req.params.id);
  if (!existing || isDemoVehicle(existing) || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Vehicle not found" });
  }
  const drivers = await db.fetchAll("profiles", existing.company_id);
  await Promise.all(
    drivers
      .filter((d) => d.assigned_vehicle_id === existing.id)
      .map((d) => db.update("profiles", d.id, { assigned_vehicle_id: null })),
  );
  await db.remove("vehicles", req.params.id);
  res.json({ ok: true });
});

const assignVehicleToDriver = async (companyId, driverId, vehicleId) => {
  const vehicles = await db.fetchAll("vehicles", companyId);
  await Promise.all(
    vehicles
      .filter((v) => v.assigned_driver_id === driverId && v.id !== vehicleId)
      .map((v) =>
        db.update("vehicles", v.id, {
          assigned_driver_id: null,
          status: v.status === "in_use" ? "available" : v.status,
        }),
      ),
  );
  if (vehicleId) {
    const current = vehicles.find((v) => v.id === vehicleId);
    if (!current) throw new Error("Vehicle not found");
    if (current.assigned_driver_id && current.assigned_driver_id !== driverId) {
      await db.update("profiles", current.assigned_driver_id, { assigned_vehicle_id: null });
    }
    await db.update("vehicles", vehicleId, {
      assigned_driver_id: driverId,
      status: current.status === "maintenance" ? "maintenance" : "in_use",
    });
  }
  return db.update("profiles", driverId, { assigned_vehicle_id: vehicleId || null });
};

app.patch("/api/drivers/:id", requireAuth, requirePermission("drivers", "edit"), async (req, res) => {
  try {
    if (!canListCompanyPeople(req.user)) {
      return res.status(403).json({ error: "Not allowed for this role" });
    }
    const existing = await db.getById("profiles", req.params.id);
    if (!existing || existing.company_id !== req.user.company_id || existing.role !== "driver") {
      return res.status(404).json({ error: "Driver not found" });
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "assigned_vehicle_id")) {
      const row = await assignVehicleToDriver(
        req.user.company_id,
        req.params.id,
        req.body.assigned_vehicle_id || null,
      );
      return res.json(db.publicUser(row));
    }
    const row = await db.update("profiles", req.params.id, req.body || {});
    res.json(db.publicUser(row));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/drivers", requireAuth, requirePermission("drivers", "create"), async (req, res) => {
  try {
    if (!canListCompanyPeople(req.user)) {
      return res.status(403).json({ error: "Not allowed for this role" });
    }
    const bcrypt = (await import("bcryptjs")).default;
    const companyId = req.body.company_id || req.body.companyId || req.user.company_id;
    const company = await db.getById("companies", companyId);
    if (!company) return res.status(400).json({ error: "Select a valid company" });
    const email = normalizeEmail(req.body.email || req.body.emailAddress);
    const fullName = req.body.full_name || `${req.body.firstName || ""} ${req.body.lastName || ""}`.trim();
    if (!email || !fullName) return res.status(400).json({ error: "Name and email are required" });
    const roleMap = { supervisor: "fleet_manager" };
    let role = roleMap[req.body.role || req.body.rolePosition] || req.body.role || req.body.rolePosition || "driver";
    let roleId = req.body.role_id || "";
    if (roleId) {
      const listed = await db.fetchAll("roles", company.id);
      const roleRow =
        listed.find((row) => row.id === roleId || row.RoleID === roleId) || (await db.getById("roles", roleId));
      if (roleRow) {
        role = roleRow.key || role;
        roleId = roleRow.RoleID;
      }
    }
    const allowedRoles = ["admin", "fleet_manager", "driver", "finance", "super_admin"];
    role = allowedRoles.includes(role) ? role : "driver";
    const documents = Array.isArray(req.body.documents) ? req.body.documents : [];
    const photo_url = req.body.photo_url || "";
    const status = "active";
    const loginPassword = String(req.body.password || req.body.temporaryPassword || "").trim();
    if (loginPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const password_hash = bcrypt.hashSync(loginPassword, 10);
    const existing = await db.findUserByEmail(email);
    const authUser = await upsertAuthUser({
      email,
      password: loginPassword,
      fullName,
      userId: existing?.id,
    });
    const profileFields = {
      company_id: company.id,
      email,
      full_name: fullName,
      role,
      role_id: roleId || ROLE_IDS[role] || "",
      phone: req.body.phone || req.body.contactNumber || "",
      license_no: req.body.license_no || req.body.driversLicenseNumber || "",
      license_expiry: req.body.license_expiry || req.body.licenseExpiryDate || "",
      license_codes: req.body.license_codes || req.body.licenseCodes || "",
      prdp: req.body.prdp || "not_required",
      id_number: req.body.id_number || req.body.idNumber || "",
      address: req.body.address || req.body.physicalAddress || "",
      start_date: req.body.start_date || req.body.startDate || "",
      emergency_contact_name: req.body.emergency_contact_name || req.body.emergencyContactName || "",
      emergency_contact_number: req.body.emergency_contact_number || req.body.emergencyContactNumber || "",
      photo_url,
      documents,
      status,
      password_hash,
    };
    let row;
    if (existing) {
      row = await db.update("profiles", existing.id, profileFields);
    } else {
      row = await db.insert("profiles", {
        ...profileFields,
        ...(authUser?.id ? { id: authUser.id } : {}),
        employee_id: await db.nextEmployeeId(company),
      });
    }
    if (row && !row.password_hash) {
      row = await db.update("profiles", row.id, { password_hash });
    }
    await notifyInvite({
      company,
      person: row,
      username: email,
      password: loginPassword,
      inviterName: req.user.full_name,
    }).catch((error) => console.error("[mail] invite", error.message));
    const vehicleId = req.body.assigned_vehicle_id || req.body.vehicle_id || "";
    if (vehicleId) {
      await assignVehicleToDriver(company.id, row.id, vehicleId);
      const assigned = await db.getUser(row.id);
      return res.json(db.publicUser(assigned));
    }
    res.json(db.publicUser(row));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/checkins", requireAuth, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Enter a valid amount" });
    }
    if (!req.body.vehicle_id) {
      return res.status(400).json({ error: "Select a vehicle" });
    }
    if (!req.body.proof_url) {
      return res.status(400).json({ error: "Upload proof of payment" });
    }
    const driverId = req.user.role === "driver" ? req.user.id : req.body.driver_id;
    if (!driverId) return res.status(400).json({ error: "Select a driver" });
    const { companyId, vehicle: assigned } = await resolveTenantCompany(req.user, {
      driverId,
      vehicleId: req.body.vehicle_id,
    });
    const km = Number(req.body.odometer);
    const lastKm = Number(assigned?.odometer || 0);
    if (!Number.isFinite(km) || km < 0) {
      return res.status(400).json({ error: "Enter the odometer reading" });
    }
    if (km < lastKm) {
      return res.status(400).json({
        error: `Odometer cannot be less than the previous reading (${lastKm.toLocaleString("en-ZA")} km)`,
      });
    }
    const schedule = await scheduleForDriver(companyId, driverId);
    const lateFee = computeLateFee(schedule);
    const row = await db.insert("checkins", {
      company_id: companyId,
      driver_id: driverId,
      vehicle_id: req.body.vehicle_id,
      cash_amount: amount,
      late_fee_applied: lateFee,
      amount: amount + lateFee,
      note: req.body.note || "",
      proof_url: req.body.proof_url,
      odometer: km,
      status: "submitted",
    });
    await syncVehicleOdometer(req.body.vehicle_id, req.body.odometer);
    await evaluateCompanyServices(companyId).catch((error) =>
      console.error("[service] after check-in", error.message),
    );
    const [driver, vehicle, company] = await Promise.all([
      db.getUser(driverId),
      db.getById("vehicles", req.body.vehicle_id),
      db.getById("companies", companyId),
    ]);
    const balance = await remainingOnSchedule(companyId, driverId, schedule);
    await notifyCheckinSuccess({ company, driver, vehicle, checkin: row, lateFee, balance }).catch((error) =>
      console.error("[mail] check-in", error.message),
    );
    res.json(row);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.patch("/api/checkins/:id", requireAuth, requirePermission("checkins", "edit"), async (req, res) => {
  const existing = await db.getById("checkins", req.params.id);
  if (!existing || existing.demo || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Check-in not found" });
  }
  const allowed = {};
  ["status", "amount", "odometer", "note", "proof_url", "vehicle_id", "driver_id"].forEach((key) => {
    if (req.body[key] !== undefined) allowed[key] = req.body[key];
  });
  if (allowed.amount !== undefined) allowed.amount = Number(allowed.amount);
  if (allowed.odometer !== undefined) {
    const km = Number(allowed.odometer);
    const vehicle = await db.getById("vehicles", allowed.vehicle_id || existing.vehicle_id);
    const lastKm = Number(vehicle?.odometer || 0);
    if (!Number.isFinite(km) || km < 0) {
      return res.status(400).json({ error: "Enter the odometer reading" });
    }
    if (km < lastKm) {
      return res.status(400).json({
        error: `Odometer cannot be less than the previous reading (${lastKm.toLocaleString("en-ZA")} km)`,
      });
    }
    allowed.odometer = km;
  }
  const row = await db.update("checkins", req.params.id, allowed);
  if (allowed.odometer !== undefined || allowed.vehicle_id) {
    await syncVehicleOdometer(row.vehicle_id, row.odometer);
    await evaluateCompanyServices(row.company_id);
  }
  res.json(row);
});

app.delete("/api/checkins/:id", requireAuth, requirePermission("checkins", "delete"), async (req, res) => {
  const existing = await db.getById("checkins", req.params.id);
  if (!existing || existing.demo || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Check-in not found" });
  }
  await db.remove("checkins", req.params.id);
  res.json({ ok: true });
});

app.get("/api/expenses", requireAuth, listRoute("expenses"));

app.post("/api/expenses", requireAuth, async (req, res) => {
  try {
    if (req.user.role === "driver") {
      return res.status(403).json({ error: "Drivers cannot log expenses" });
    }
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Enter a valid amount" });
    }
    if (!req.body.vehicle_id) {
      return res.status(400).json({ error: "Select a vehicle" });
    }
    const frequency = req.body.frequency === "monthly" ? "monthly" : "once_off";
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Select an expense name" });
    }
    const driverId = req.user.role === "driver" ? req.user.id : req.body.driver_id;
    if (!driverId) return res.status(400).json({ error: "Select a driver" });
    const { companyId } = await resolveTenantCompany(req.user, {
      driverId,
      vehicleId: req.body.vehicle_id,
    });
    const row = await db.insert("expenses", {
      company_id: companyId,
      driver_id: driverId,
      vehicle_id: req.body.vehicle_id,
      name,
      amount,
      note: req.body.note || "",
      proof_url: req.body.proof_url || "",
      frequency,
      status: "submitted",
    });
    res.json(row);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.patch("/api/expenses/:id", requireAuth, requirePermission("checkins", "edit"), async (req, res) => {
  const existing = await db.getById("expenses", req.params.id);
  if (!existing || existing.demo || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Expense not found" });
  }
  const allowed = {};
  ["status", "amount", "note", "proof_url", "vehicle_id", "driver_id", "frequency", "name"].forEach((key) => {
    if (req.body[key] !== undefined) allowed[key] = req.body[key];
  });
  if (allowed.amount !== undefined) allowed.amount = Number(allowed.amount);
  if (allowed.frequency !== undefined) {
    allowed.frequency = allowed.frequency === "monthly" ? "monthly" : "once_off";
  }
  res.json(await db.update("expenses", req.params.id, allowed));
});

app.delete("/api/expenses/:id", requireAuth, requirePermission("checkins", "delete"), async (req, res) => {
  const existing = await db.getById("expenses", req.params.id);
  if (!existing || existing.demo || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Expense not found" });
  }
  await db.remove("expenses", req.params.id);
  res.json({ ok: true });
});

app.post("/api/reviews", requireAuth, async (req, res) => {
  try {
    const photos = Array.isArray(req.body.photos) ? req.body.photos : [];
    if (photos.length < 4) {
      return res.status(400).json({
        error: "Upload at least four photos: front, rear, left, right",
      });
    }
    if (!req.body.vehicle_id) return res.status(400).json({ error: "Select a vehicle" });
    const vehicle = await db.getById("vehicles", req.body.vehicle_id);
    if (!vehicle || isDemoVehicle(vehicle)) return res.status(400).json({ error: "Select a vehicle" });
    const driverId =
      req.user.role === "driver" ? req.user.id : req.body.driver_id || vehicle.assigned_driver_id;
    if (!driverId) return res.status(400).json({ error: "Select a driver" });
    const { companyId } = await resolveTenantCompany(req.user, {
      driverId,
      vehicleId: req.body.vehicle_id,
    });
    const row = await db.insert("reviews", {
      company_id: companyId,
      driver_id: driverId,
      vehicle_id: req.body.vehicle_id,
      review_month: req.body.review_month || new Date().toISOString().slice(0, 10),
      condition: req.body.condition || "good",
      notes: req.body.notes || "",
      photos,
      status: "submitted",
      reviewer_note: "",
    });
    res.json(row);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.patch("/api/reviews/:id", requireAuth, requirePermission("reviews", "edit"), async (req, res) => {
  const existing = await db.getById("reviews", req.params.id);
  if (!existing || existing.demo || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Review not found" });
  }
  const allowed = {};
  if (req.body.status !== undefined) allowed.status = req.body.status;
  if (req.body.condition !== undefined) allowed.condition = req.body.condition;
  if (req.body.notes !== undefined) allowed.notes = req.body.notes;
  if (req.body.reviewer_note !== undefined) allowed.reviewer_note = req.body.reviewer_note;
  const row = await db.update("reviews", req.params.id, allowed);
  res.json(row);
});

app.delete("/api/reviews/:id", requireAuth, requirePermission("reviews", "delete"), async (req, res) => {
  const existing = await db.getById("reviews", req.params.id);
  if (!existing || existing.demo || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Review not found" });
  }
  await db.remove("reviews", req.params.id);
  res.json({ ok: true });
});

app.post("/api/checkouts", requireAuth, async (req, res) => {
  const row = await db.insert("checkouts", {
    company_id: req.user.company_id,
    driver_id: req.user.role === "driver" ? req.user.id : req.body.driver_id,
    vehicle_id: req.body.vehicle_id,
    km_out: Number(req.body.km_out) || 0,
    km_in: null,
    status: "checked_out",
  });
  res.json(row);
});

app.patch("/api/checkouts/:id", requireAuth, async (req, res) => {
  const row = await db.update("checkouts", req.params.id, {
    km_in: Number(req.body.km_in) || 0,
    status: "checked_in",
    returned_at: new Date().toISOString(),
  });
  res.json(row);
});

app.post("/api/incidents", requireAuth, async (req, res) => {
  try {
    if (!req.body.vehicle_id) return res.status(400).json({ error: "Select a vehicle" });
    const loggedBy = req.user.role === "driver" ? req.user.id : req.body.logged_by || req.body.driver_id;
    if (!loggedBy) return res.status(400).json({ error: "Select who logged this" });
    const { companyId } = await resolveTenantCompany(req.user, {
      driverId: loggedBy,
      vehicleId: req.body.vehicle_id,
    });
    const row = await db.insert("incidents", {
      company_id: companyId,
      driver_id: loggedBy,
      logged_by: loggedBy,
      vehicle_id: req.body.vehicle_id,
      kind: req.body.kind === "claim" ? "claim" : "incident",
      title: req.body.title,
      amount: Number(req.body.amount) || 0,
      severity: req.body.severity || "medium",
      description: req.body.description || "",
      photos: Array.isArray(req.body.photos) ? req.body.photos : [],
      occurred_at: req.body.occurred_at || new Date().toISOString(),
      status: req.body.status || "open",
    });
    res.json(row);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.patch("/api/incidents/:id", requireAuth, requirePermission("incidents", "edit"), async (req, res) => {
  const existing = await db.getById("incidents", req.params.id);
  if (!existing || existing.demo || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Incident not found" });
  }
  const allowed = {};
  ["status", "kind", "title", "amount", "severity", "description", "vehicle_id", "occurred_at", "photos", "logged_by"].forEach((key) => {
    if (req.body[key] !== undefined) allowed[key] = req.body[key];
  });
  if (allowed.amount !== undefined) allowed.amount = Number(allowed.amount) || 0;
  if (allowed.logged_by) allowed.driver_id = allowed.logged_by;
  res.json(await db.update("incidents", req.params.id, allowed));
});

app.delete("/api/incidents/:id", requireAuth, requirePermission("incidents", "delete"), async (req, res) => {
  const existing = await db.getById("incidents", req.params.id);
  if (!existing || existing.demo || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Incident not found" });
  }
  await db.remove("incidents", existing.id);
  res.json({ ok: true });
});

app.post("/api/maintenance", requireAuth, requirePermission("maintenance", "create"), async (req, res) => {
  if (req.user.role === "driver") return res.status(403).json({ error: "Drivers can view service only" });
  if (!req.body.vehicle_id) return res.status(400).json({ error: "Select a vehicle" });
  const vehicle = await db.getById("vehicles", req.body.vehicle_id);
  if (!vehicle || isDemoVehicle(vehicle) || !companyScopeOk(req.user, vehicle.company_id)) {
    return res.status(404).json({ error: "Vehicle not found" });
  }
  const lastKm = Number(req.body.last_service_odometer ?? vehicle.odometer ?? 0);
  const lastAt = req.body.last_service_at || new Date().toISOString();
  await db.update("vehicles", vehicle.id, { service_paused: false });
  const row = await db.insert("maintenance", {
    company_id: vehicle.company_id,
    vehicle_id: req.body.vehicle_id,
    title: req.body.title || "Service",
    interval_km: Number(req.body.interval_km) || 10000,
    interval_months: Number(req.body.interval_months) || 2,
    last_service_odometer: lastKm,
    last_service_at: lastAt,
    status: "scheduled",
    slips: [],
  });
  await evaluateCompanyServices(vehicle.company_id);
  res.json(row);
});

app.patch("/api/maintenance/:id", requireAuth, requirePermission("maintenance", "edit"), async (req, res) => {
  if (req.user.role === "driver") return res.status(403).json({ error: "Drivers can view service only" });
  const existing = await db.getById("maintenance", req.params.id);
  if (!existing || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Service not found" });
  }
  const slips = Array.isArray(req.body.slips) ? req.body.slips : existing.slips || [];
  if (req.body.status === "completed") {
    if (!slips.length) {
      return res.status(400).json({ error: "Upload the service slip before marking it done" });
    }
    const vehicle = await db.getById("vehicles", existing.vehicle_id);
    const doneKm = Number(
      req.body.completed_odometer ?? vehicle?.odometer ?? existing.last_service_odometer ?? 0,
    );
    const doneAt = new Date().toISOString();
    const done = await db.update("maintenance", existing.id, {
      status: "completed",
      slips,
      completed_at: doneAt,
      completed_odometer: doneKm,
    });
    await evaluateCompanyServices(existing.company_id);
    return res.json(done);
  }
  const allowed = {};
  ["title", "interval_km", "interval_months", "last_service_odometer", "last_service_at", "due_date", "slips"].forEach((key) => {
    if (req.body[key] !== undefined) allowed[key] = req.body[key];
  });
  if (allowed.interval_km !== undefined) allowed.interval_km = Number(allowed.interval_km) || 10000;
  if (allowed.interval_months !== undefined) allowed.interval_months = Number(allowed.interval_months) || 2;
  if (allowed.last_service_odometer !== undefined) {
    allowed.last_service_odometer = Number(allowed.last_service_odometer) || 0;
  }
  if (allowed.due_date === "") allowed.due_date = null;
  if (req.body.slips) allowed.slips = slips;
  const row = await db.update("maintenance", existing.id, allowed);
  await evaluateCompanyServices(existing.company_id);
  res.json(row);
});

app.delete("/api/maintenance/:id", requireAuth, requirePermission("maintenance", "delete"), async (req, res) => {
  if (req.user.role === "driver") return res.status(403).json({ error: "Drivers can view service only" });
  const existing = await db.getById("maintenance", req.params.id);
  if (!existing || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Service not found" });
  }
  await db.remove("maintenance", existing.id);
  await evaluateCompanyServices(existing.company_id);
  res.json({ ok: true });
});

app.post("/api/documents", requireAuth, requirePermission("documents", "create"), async (req, res) => {
  if (!String(req.body.title || "").trim()) return res.status(400).json({ error: "Document name is required" });
  if (!req.body.file_url) return res.status(400).json({ error: "Upload a file" });
  const companies = (await db.fetchAll("companies")).filter((company) => !company.demo);
  const companyId = req.body.company_id || companies[0]?.id || req.user.company_id;
  const row = await db.insert("documents", {
    company_id: companyId,
    title: req.body.title,
    description: req.body.description || "",
    type: req.body.type || req.body.category || "file",
    category: req.body.category || "general",
    file_url: req.body.file_url || "",
    uploaded_by: req.user.id,
    uploaded_by_name:
      req.user.role === "super_admin" || ["Thabo Mokoena", "Lerato Dlamini"].includes(req.user.full_name)
        ? "BrightByte"
        : req.user.full_name || req.user.email,
  });
  res.json(row);
});

app.delete("/api/documents/:id", requireAuth, requirePermission("documents", "delete"), async (req, res) => {
  const existing = await db.getById("documents", req.params.id);
  if (!existing || existing.demo || ["d-1", "d-2", "d-3", "d-4", "d-5"].includes(existing.id)) {
    return res.status(404).json({ error: "Document not found" });
  }
  await db.remove("documents", existing.id);
  res.json({ ok: true });
});

app.post("/api/supplies", requireAuth, requirePermission("vehicles", "edit"), async (req, res) => {
  const vehicle = req.body.vehicle_id ? await db.getById("vehicles", req.body.vehicle_id) : null;
  const companyId = req.body.company_id || vehicle?.company_id || req.user.company_id;
  if (!companyScopeOk(req.user, companyId)) {
    return res.status(403).json({ error: "Not allowed for this company" });
  }
  const row = await db.insert("supplies", {
    company_id: companyId,
    vehicle_id: req.body.vehicle_id || null,
    name: req.body.name,
    qty: Number(req.body.qty) || 0,
    unit: req.body.unit || "ea",
    location: req.body.location || "",
  });
  res.json(row);
});

app.post("/api/mechanics", requireAuth, requirePermission("mechanics", "create"), async (req, res) => {
  let companyId = req.body.company_id || req.user.company_id;
  if (req.user.role === "super_admin" && !req.body.company_id) {
    const companies = (await db.fetchAll("companies")).filter((company) => !company.demo);
    companyId = companies[0]?.id;
  }
  if (!companyId || !companyScopeOk(req.user, companyId)) {
    return res.status(403).json({ error: "Not allowed for this company" });
  }
  const company = await db.getById("companies", companyId);
  if (!company || company.demo) return res.status(400).json({ error: "Select a valid company" });
  if (!String(req.body.full_name || "").trim()) {
    return res.status(400).json({ error: "Mechanic name is required" });
  }
  if (!String(req.body.phone || "").trim()) {
    return res.status(400).json({ error: "Phone is required" });
  }
  const row = await db.insert("mechanics", {
    company_id: companyId,
    full_name: req.body.full_name,
    trade: req.body.trade || "Mechanic",
    phone: req.body.phone || "",
    workshop: req.body.workshop || "",
    hours: req.body.hours || "",
    after_hours: Boolean(req.body.after_hours),
    photo_url: req.body.photo_url || "",
  });
  res.json(row);
});

app.patch("/api/mechanics/:id", requireAuth, requirePermission("mechanics", "edit"), async (req, res) => {
  const existing = await db.getById("mechanics", req.params.id);
  if (!existing || existing.demo || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Mechanic not found" });
  }
  const allowed = {};
  ["full_name", "trade", "phone", "workshop", "hours", "after_hours", "photo_url"].forEach((key) => {
    if (req.body[key] !== undefined) allowed[key] = req.body[key];
  });
  if (allowed.after_hours !== undefined) allowed.after_hours = Boolean(allowed.after_hours);
  res.json(await db.update("mechanics", existing.id, allowed));
});

app.delete("/api/mechanics/:id", requireAuth, requirePermission("mechanics", "delete"), async (req, res) => {
  const existing = await db.getById("mechanics", req.params.id);
  if (!existing || existing.demo || !companyScopeOk(req.user, existing.company_id)) {
    return res.status(404).json({ error: "Mechanic not found" });
  }
  await db.remove("mechanics", existing.id);
  res.json({ ok: true });
});

app.post("/api/refuels", requireAuth, async (req, res) => {
  const row = await db.insert("refuels", {
    company_id: req.user.company_id,
    driver_id: req.user.role === "driver" ? req.user.id : req.body.driver_id,
    vehicle_id: req.body.vehicle_id,
    litres: Number(req.body.litres) || 0,
    amount: Number(req.body.amount) || 0,
    station: req.body.station || "",
  });
  res.json(row);
});

export { app };

if (!onLambda) {
  app.listen(config.port, () => {
    console.log(`Fleet21 API on http://localhost:${config.port} (${useSupabase ? "supabase" : "local"})`);
    tickNotifications();
    setInterval(tickNotifications, 10 * 60 * 1000);
  });
}
