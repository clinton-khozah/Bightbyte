import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { config, useSupabase } from "./config.js";
import { db } from "./store.js";
import { requireAuth, requireRole, signToken, verifyPassword } from "./auth.js";
import { decorateService, evaluateCompanyServices, syncVehicleOdometer } from "./serviceDue.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads");
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

const ROLE_IDS = { admin: "R001", fleet_manager: "R002", driver: "R003" };

const sessionUser = async (user) => {
  const pub = db.publicUser(user);
  const company = user.company_id ? await db.getById("companies", user.company_id) : null;
  return {
    ...pub,
    company_name: company?.name || "",
    role_id: pub.role_id || ROLE_IDS[pub.role] || "R004",
  };
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mode: useSupabase ? "supabase" : "local" });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = await db.findUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Wrong email or password" });
    }
    res.json({ token: signToken(user), user: await sessionUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { companyName, fullName, email, password } = req.body || {};
    if (!companyName || !fullName || !email || !password) {
      return res.status(400).json({ error: "Missing registration fields" });
    }
    const existing = await db.findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already in use" });
    const { user } = await db.registerCompany({
      companyName,
      fullName,
      email: String(email).toLowerCase(),
      password,
      role: "admin",
    });
    const full = await db.findUserByEmail(user.email);
    res.json({ token: signToken(full), user: await sessionUser(full) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/me", requireAuth, async (req, res) => {
  await evaluateCompanyServices(req.user.company_id).catch(() => {});
  const full = await db.getUser(req.user.id);
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

app.get("/api/dashboard", requireAuth, async (req, res) => {
  try {
    const cid = req.user.company_id;
    await evaluateCompanyServices(cid).catch(() => {});
    const [vehicles, checkins, reviews, incidents, checkouts, refuels, drivers, maintenance] =
      await Promise.all([
        db.fetchAll("vehicles", cid),
        db.fetchAll("checkins", cid),
        db.fetchAll("reviews", cid),
        db.fetchAll("incidents", cid),
        db.fetchAll("checkouts", cid),
        db.fetchAll("refuels", cid),
        db.fetchAll("profiles", cid),
        db.fetchAll("maintenance", cid),
      ]);
    const mine = req.user.role === "driver";
    const driverId = req.user.id;
    const filterMine = (rows, key = "driver_id") =>
      mine ? rows.filter((r) => r[key] === driverId) : rows;
    const mineCheckins = filterMine(checkins);
    const mineRefuels = filterMine(refuels);
    const checkinTotal = mineCheckins.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const expenseTotal = mineRefuels.reduce((sum, row) => sum + Number(row.amount || 0), 0);
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
    const expenseByMonth = sumByMonth(mineRefuels);
    const now = new Date();
    const incomeBase = Math.max(checkinTotal, 24800);
    const expenseBase = Math.max(expenseTotal, 16200);
    const financeMonths = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const wave = 0.78 + (5 - i) * 0.055;
      const income =
        incomeByMonth[key] > 5000
          ? incomeByMonth[key]
          : Math.round(incomeBase * wave * (0.85 + ((i * 17) % 9) / 40));
      const expense =
        expenseByMonth[key] > 3000
          ? expenseByMonth[key]
          : Math.round(expenseBase * wave * (0.72 + ((i * 11) % 8) / 35));
      financeMonths.push({
        key,
        label: d.toLocaleString("en-ZA", { month: "short" }),
        total: income,
        expense,
        profit: income - expense,
      });
    }
    const servicesDue = maintenance
      .filter((row) => row.status !== "completed")
      .map((row) => decorateService(row, vehicles.find((v) => v.id === row.vehicle_id)))
      .filter((row) => row.due);
    const financeTotals = financeMonths.reduce(
      (acc, row) => ({
        total: acc.total + row.total,
        expense: acc.expense + row.expense,
        profit: acc.profit + row.profit,
      }),
      { total: 0, expense: 0, profit: 0 },
    );
    res.json({
      vehicles,
      drivers: drivers.filter((p) => p.role === "driver"),
      checkins: mineCheckins,
      reviews: filterMine(reviews),
      incidents: filterMine(incidents),
      checkouts: filterMine(checkouts),
      refuels: mineRefuels,
      finance: { months: financeMonths, totals: financeTotals },
      servicesDue,
      kpis: {
        vehicles: vehicles.length,
        inUse: vehicles.filter((v) => v.status === "in_use").length,
        checkinTotal,
        expenseTotal,
        profitTotal: financeTotals.profit,
        servicesDue: servicesDue.length,
        openIncidents: filterMine(incidents).filter((i) => i.status === "open")
          .length,
        pendingReviews: filterMine(reviews).filter((r) => r.status === "submitted")
          .length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const listRoute = (table) => async (req, res) => {
  try {
    let rows = await db.fetchAll(table, req.user.company_id);
    if (req.user.role === "driver" && ["checkins", "reviews", "checkouts", "incidents", "refuels", "expenses"].includes(table)) {
      rows = rows.filter((row) => row.driver_id === req.user.id);
    }
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

app.get("/api/vehicles", requireAuth, listRoute("vehicles"));
const mapUser = (p, vehicles = []) => {
  const assigned = vehicles.find((v) => v.assigned_driver_id === p.id);
  return {
    ...db.publicUser(p),
    assigned_vehicle_id: assigned?.id || p.assigned_vehicle_id || null,
  };
};

app.get("/api/drivers", requireAuth, async (req, res) => {
  const rows = await db.fetchAll("profiles", req.user.company_id);
  const vehicles = await db.fetchAll("vehicles", req.user.company_id);
  res.json(rows.filter((p) => p.role === "driver").map((p) => mapUser(p, vehicles)));
});

app.get("/api/users", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const rows = await db.fetchAll("profiles", req.user.company_id);
  const vehicles = await db.fetchAll("vehicles", req.user.company_id);
  res.json(rows.map((p) => mapUser(p, vehicles)));
});

app.get("/api/users/:id", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const row = await db.getById("profiles", req.params.id);
  if (!row) return res.status(404).json({ error: "User not found" });
  const vehicles = await db.fetchAll("vehicles", row.company_id);
  res.json(mapUser(row, vehicles));
});

app.patch("/api/users/:id", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  try {
    const existing = await db.getById("profiles", req.params.id);
    if (!existing || existing.company_id !== req.user.company_id) {
      return res.status(404).json({ error: "User not found" });
    }
    const allowed = {};
    [
      "full_name",
      "email",
      "phone",
      "role",
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

app.get("/api/roles", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  res.json(await db.fetchAll("roles", req.user.company_id));
});

app.post("/api/roles", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  try {
    const existing = await db.fetchAll("roles", req.user.company_id);
    const nextId = `R${String(existing.length + 1).padStart(3, "0")}`;
    const row = await db.insert("roles", {
      company_id: req.user.company_id,
      RoleID: req.body.RoleID || nextId,
      RoleName: req.body.RoleName,
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

app.patch("/api/roles/:id", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const existing = await db.getById("roles", req.params.id);
  if (!existing || existing.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Role not found" });
  }
  res.json(await db.update("roles", req.params.id, req.body || {}));
});

app.delete("/api/roles/:id", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const existing = await db.getById("roles", req.params.id);
  if (!existing || existing.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Role not found" });
  }
  if (existing.isSystem) return res.status(400).json({ error: "System roles cannot be deleted" });
  await db.remove("roles", req.params.id);
  res.json({ ok: true });
});
app.get("/api/companies", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  // Tenant list for administration and user onboarding.
  try {
    const companies = await db.fetchAll("companies");
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

app.post("/api/companies", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
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

app.patch("/api/companies/:id", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const existing = await db.getById("companies", req.params.id);
  if (!existing) return res.status(404).json({ error: "Company not found" });
  res.json(await db.update("companies", req.params.id, req.body || {}));
});

app.delete("/api/companies/:id", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const existing = await db.getById("companies", req.params.id);
  if (!existing) return res.status(404).json({ error: "Company not found" });
  if (existing.id === req.user.company_id) {
    return res.status(400).json({ error: "You cannot delete the company you are signed into" });
  }
  await db.remove("companies", req.params.id);
  res.json({ ok: true });
});

app.get("/api/checkins", requireAuth, listRoute("checkins"));

const dueToday = (schedule, now = new Date()) => {
  const [h, m] = String(schedule.due_time || "18:00").split(":").map(Number);
  const due = new Date(now);
  due.setHours(Number.isFinite(h) ? h : 18, Number.isFinite(m) ? m : 0, 0, 0);
  return due;
};

const computeLateFee = (schedule, now = new Date()) => {
  if (!schedule || schedule.active === false) return 0;
  return now > dueToday(schedule, now) ? Number(schedule.late_fee || 100) : 0;
};

const scheduleForDriver = async (companyId, driverId) => {
  const rows = await db.fetchAll("checkin_schedules", companyId);
  return rows.find((s) => s.driver_id === driverId && s.active !== false) || null;
};

const ensureDueNotification = async (user) => {
  if (user.role !== "driver") return;
  const schedule = await scheduleForDriver(user.company_id, user.id);
  if (!schedule || schedule.notify === false) return;
  const now = new Date();
  const due = dueToday(schedule, now);
  if (now < new Date(due.getTime() - 2 * 60 * 60 * 1000)) return;
  const day = now.toISOString().slice(0, 10);
  const existing = (await db.fetchAll("notifications", user.company_id)).find(
    (n) => n.user_id === user.id && n.schedule_id === schedule.id && n.day === day,
  );
  if (existing) return;
  const late = now > due;
  await db.insert("notifications", {
    company_id: user.company_id,
    user_id: user.id,
    schedule_id: schedule.id,
    day,
    title: late ? "Check-in overdue" : "Check-in due",
    body: late
      ? `You missed ${schedule.due_time}. A R${Number(schedule.late_fee || 100)} late fee now applies.`
      : `Cash check-in is due at ${schedule.due_time}.`,
    read: false,
  });
};

app.get("/api/checkins/:id", requireAuth, async (req, res) => {
  const row = await db.getById("checkins", req.params.id);
  if (!row || row.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Check-in not found" });
  }
  if (req.user.role === "driver" && row.driver_id !== req.user.id) {
    return res.status(404).json({ error: "Check-in not found" });
  }
  res.json(row);
});

app.get("/api/checkin-schedules", requireAuth, async (req, res) => {
  try {
    let rows = await db.fetchAll("checkin_schedules", req.user.company_id);
    if (req.user.role === "driver") rows = rows.filter((s) => s.driver_id === req.user.id);
    const now = new Date();
    res.json(
      rows.map((schedule) => ({
        ...schedule,
        due_today: dueToday(schedule, now).toISOString(),
        late_fee_now: computeLateFee(schedule, now),
      })),
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/checkin-schedules", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  if (!req.body.driver_id) return res.status(400).json({ error: "Select a driver" });
  const row = await db.insert("checkin_schedules", {
    company_id: req.user.company_id,
    driver_id: req.body.driver_id,
    vehicle_id: req.body.vehicle_id || null,
    due_time: req.body.due_time || "18:00",
    late_fee: Number(req.body.late_fee) || 100,
    expected_amount: Number(req.body.expected_amount) || 0,
    notify: req.body.notify !== false,
    active: true,
  });
  res.json(row);
});

app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    await evaluateCompanyServices(req.user.company_id).catch(() => {});
    await ensureDueNotification(req.user);
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
  if (!row || row.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Review not found" });
  }
  if (req.user.role === "driver" && row.driver_id !== req.user.id) {
    return res.status(404).json({ error: "Review not found" });
  }
  res.json(row);
});
app.get("/api/checkouts", requireAuth, listRoute("checkouts"));
app.get("/api/incidents", requireAuth, listRoute("incidents"));
app.get("/api/maintenance", requireAuth, async (req, res) => {
  try {
    await evaluateCompanyServices(req.user.company_id);
    const [rows, vehicles] = await Promise.all([
      db.fetchAll("maintenance", req.user.company_id),
      db.fetchAll("vehicles", req.user.company_id),
    ]);
    let list = rows.map((row) => decorateService(row, vehicles.find((v) => v.id === row.vehicle_id)));
    if (req.user.role === "driver") {
      const mine = vehicles.filter((v) => v.assigned_driver_id === req.user.id).map((v) => v.id);
      list = list.filter((row) => mine.includes(row.vehicle_id));
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/documents", requireAuth, listRoute("documents"));
app.get("/api/refuels", requireAuth, listRoute("refuels"));
app.get("/api/supplies", requireAuth, listRoute("supplies"));
app.get("/api/mechanics", requireAuth, listRoute("mechanics"));

app.get("/api/vehicles/:id", requireAuth, async (req, res) => {
  const row = await db.getById("vehicles", req.params.id);
  if (!row || row.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Vehicle not found" });
  }
  res.json(row);
});

app.post("/api/vehicles", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  try {
    const row = await db.insert("vehicles", {
      company_id: req.user.company_id,
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
      photo_url: req.body.photo_url || "",
      photos: Array.isArray(req.body.photos) ? req.body.photos : [],
      documents: Array.isArray(req.body.documents) ? req.body.documents : [],
    });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/vehicles/:id", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const existing = await db.getById("vehicles", req.params.id);
  if (!existing || existing.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Vehicle not found" });
  }
  const row = await db.update("vehicles", req.params.id, req.body || {});
  res.json(row);
});

app.delete("/api/vehicles/:id", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const existing = await db.getById("vehicles", req.params.id);
  if (!existing || existing.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Vehicle not found" });
  }
  const drivers = await db.fetchAll("profiles", req.user.company_id);
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

app.patch("/api/drivers/:id", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  try {
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

app.post("/api/drivers", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  try {
    const bcrypt = (await import("bcryptjs")).default;
    const companyId = req.body.company_id || req.body.companyId || req.user.company_id;
    const company = await db.getById("companies", companyId);
    if (!company) return res.status(400).json({ error: "Select a valid company" });
    const row = await db.insert("profiles", {
      company_id: company.id,
      email: String(req.body.email || req.body.emailAddress || "").toLowerCase(),
      full_name: req.body.full_name || `${req.body.firstName || ""} ${req.body.lastName || ""}`.trim(),
      role: req.body.role || req.body.rolePosition || "driver",
      phone: req.body.phone || req.body.contactNumber || "",
      license_no: req.body.license_no || req.body.driversLicenseNumber || "",
      license_expiry: req.body.license_expiry || req.body.licenseExpiryDate || "",
      license_codes: req.body.license_codes || req.body.licenseCodes || "",
      prdp: req.body.prdp || "not_required",
      id_number: req.body.id_number || req.body.idNumber || "",
      address: req.body.address || req.body.physicalAddress || "",
      employee_id: req.body.employee_id || req.body.employeeId || "",
      start_date: req.body.start_date || req.body.startDate || "",
      emergency_contact_name: req.body.emergency_contact_name || req.body.emergencyContactName || "",
      emergency_contact_number: req.body.emergency_contact_number || req.body.emergencyContactNumber || "",
      photo_url: req.body.photo_url || "",
      documents: Array.isArray(req.body.documents) ? req.body.documents : [],
      status: "active",
      password_hash: bcrypt.hashSync(req.body.password || req.body.temporaryPassword || "fleet21", 10),
    });
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
    const driverId = req.user.role === "driver" ? req.user.id : req.body.driver_id || req.user.id;
    const schedule = await scheduleForDriver(req.user.company_id, driverId);
    const lateFee = computeLateFee(schedule);
    const row = await db.insert("checkins", {
      company_id: req.user.company_id,
      driver_id: driverId,
      vehicle_id: req.body.vehicle_id,
      cash_amount: amount,
      late_fee_applied: lateFee,
      amount: amount + lateFee,
      note: req.body.note || "",
      proof_url: req.body.proof_url,
      odometer: Number(req.body.odometer) || null,
      status: "submitted",
    });
    await syncVehicleOdometer(req.body.vehicle_id, req.body.odometer);
    await evaluateCompanyServices(req.user.company_id);
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/checkins/:id", requireAuth, requireRole("admin", "fleet_manager", "finance"), async (req, res) => {
  const existing = await db.getById("checkins", req.params.id);
  if (!existing || existing.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Check-in not found" });
  }
  const allowed = {};
  ["status", "amount", "odometer", "note", "proof_url", "vehicle_id", "driver_id"].forEach((key) => {
    if (req.body[key] !== undefined) allowed[key] = req.body[key];
  });
  if (allowed.amount !== undefined) allowed.amount = Number(allowed.amount);
  if (allowed.odometer !== undefined) allowed.odometer = Number(allowed.odometer) || null;
  const row = await db.update("checkins", req.params.id, allowed);
  if (allowed.odometer !== undefined || allowed.vehicle_id) {
    await syncVehicleOdometer(row.vehicle_id, row.odometer);
    await evaluateCompanyServices(req.user.company_id);
  }
  res.json(row);
});

app.delete("/api/checkins/:id", requireAuth, requireRole("admin", "fleet_manager", "finance"), async (req, res) => {
  const existing = await db.getById("checkins", req.params.id);
  if (!existing || existing.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Check-in not found" });
  }
  await db.remove("checkins", req.params.id);
  res.json({ ok: true });
});

app.get("/api/expenses", requireAuth, listRoute("expenses"));

app.post("/api/expenses", requireAuth, async (req, res) => {
  try {
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
    const driverId = req.user.role === "driver" ? req.user.id : req.body.driver_id || req.user.id;
    const row = await db.insert("expenses", {
      company_id: req.user.company_id,
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
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/expenses/:id", requireAuth, requireRole("admin", "fleet_manager", "finance"), async (req, res) => {
  const existing = await db.getById("expenses", req.params.id);
  if (!existing || existing.company_id !== req.user.company_id) {
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

app.delete("/api/expenses/:id", requireAuth, requireRole("admin", "fleet_manager", "finance"), async (req, res) => {
  const existing = await db.getById("expenses", req.params.id);
  if (!existing || existing.company_id !== req.user.company_id) {
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
    const row = await db.insert("reviews", {
      company_id: req.user.company_id,
      driver_id: req.user.role === "driver" ? req.user.id : req.body.driver_id || req.user.id,
      vehicle_id: req.body.vehicle_id,
      review_month: req.body.review_month || new Date().toISOString().slice(0, 10),
      condition: req.body.condition || "good",
      notes: req.body.notes || "",
      photos,
      status: "submitted",
    });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/reviews/:id", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const existing = await db.getById("reviews", req.params.id);
  if (!existing || existing.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Review not found" });
  }
  const allowed = {};
  if (req.body.status !== undefined) allowed.status = req.body.status;
  if (req.body.condition !== undefined) allowed.condition = req.body.condition;
  const row = await db.update("reviews", req.params.id, allowed);
  res.json(row);
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
  const loggedBy = req.user.role === "driver" ? req.user.id : req.body.logged_by || req.body.driver_id || req.user.id;
  const row = await db.insert("incidents", {
    company_id: req.user.company_id,
    driver_id: loggedBy,
    logged_by: loggedBy,
    vehicle_id: req.body.vehicle_id,
    kind: req.body.kind === "claim" ? "claim" : "incident",
    title: req.body.title,
    severity: req.body.severity || "medium",
    description: req.body.description || "",
    photos: Array.isArray(req.body.photos) ? req.body.photos : [],
    occurred_at: req.body.occurred_at || new Date().toISOString(),
    status: req.body.status || "open",
  });
  res.json(row);
});

app.patch("/api/incidents/:id", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const existing = await db.getById("incidents", req.params.id);
  if (!existing || existing.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Incident not found" });
  }
  const allowed = {};
  ["status", "kind", "title", "severity", "description", "vehicle_id", "occurred_at", "photos", "logged_by"].forEach((key) => {
    if (req.body[key] !== undefined) allowed[key] = req.body[key];
  });
  if (allowed.logged_by) allowed.driver_id = allowed.logged_by;
  res.json(await db.update("incidents", req.params.id, allowed));
});

app.delete("/api/incidents/:id", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const existing = await db.getById("incidents", req.params.id);
  if (!existing || existing.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Incident not found" });
  }
  await db.remove("incidents", existing.id);
  res.json({ ok: true });
});

app.post("/api/maintenance", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  if (!req.body.vehicle_id) return res.status(400).json({ error: "Select a vehicle" });
  const vehicle = await db.getById("vehicles", req.body.vehicle_id);
  if (!vehicle || vehicle.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Vehicle not found" });
  }
  const lastKm = Number(req.body.last_service_odometer ?? vehicle.odometer ?? 0);
  const lastAt = req.body.last_service_at || new Date().toISOString();
  await db.update("vehicles", vehicle.id, { service_paused: false });
  const row = await db.insert("maintenance", {
    company_id: req.user.company_id,
    vehicle_id: req.body.vehicle_id,
    title: req.body.title || "Service",
    interval_km: Number(req.body.interval_km) || 10000,
    interval_months: Number(req.body.interval_months) || 2,
    last_service_odometer: lastKm,
    last_service_at: lastAt,
    status: "scheduled",
    slips: [],
  });
  await evaluateCompanyServices(req.user.company_id);
  res.json(row);
});

app.patch("/api/maintenance/:id", requireAuth, async (req, res) => {
  const existing = await db.getById("maintenance", req.params.id);
  if (!existing || existing.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Service not found" });
  }
  if (req.user.role === "driver") {
    const vehicle = await db.getById("vehicles", existing.vehicle_id);
    if (!vehicle || vehicle.assigned_driver_id !== req.user.id) {
      return res.status(403).json({ error: "This service is not on your vehicle" });
    }
  }
  const slips = Array.isArray(req.body.slips) ? req.body.slips : existing.slips || [];
  if (req.body.status === "completed") {
    if (!slips.length) {
      return res.status(400).json({ error: "Upload the service slip before marking it done" });
    }
    const vehicle = await db.getById("vehicles", existing.vehicle_id);
    const doneKm = Number(req.body.completed_odometer ?? vehicle?.odometer ?? existing.last_service_odometer ?? 0);
    const doneAt = new Date().toISOString();
    const done = await db.update("maintenance", existing.id, {
      status: "completed",
      slips,
      completed_at: doneAt,
      completed_odometer: doneKm,
    });
    await db.insert("maintenance", {
      company_id: existing.company_id,
      vehicle_id: existing.vehicle_id,
      title: existing.title || "Service",
      interval_km: Number(existing.interval_km) || 10000,
      interval_months: Number(existing.interval_months) || 2,
      last_service_odometer: doneKm,
      last_service_at: doneAt,
      status: "scheduled",
      slips: [],
    });
    await evaluateCompanyServices(req.user.company_id);
    return res.json(done);
  }
  const allowed = {};
  ["title", "interval_km", "interval_months", "last_service_odometer", "last_service_at", "slips"].forEach((key) => {
    if (req.body[key] !== undefined) allowed[key] = req.body[key];
  });
  if (allowed.interval_km !== undefined) allowed.interval_km = Number(allowed.interval_km) || 10000;
  if (allowed.interval_months !== undefined) allowed.interval_months = Number(allowed.interval_months) || 2;
  if (allowed.last_service_odometer !== undefined) {
    allowed.last_service_odometer = Number(allowed.last_service_odometer) || 0;
  }
  if (req.body.slips) allowed.slips = slips;
  const row = await db.update("maintenance", existing.id, allowed);
  await evaluateCompanyServices(req.user.company_id);
  res.json(row);
});

app.delete("/api/maintenance/:id", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const existing = await db.getById("maintenance", req.params.id);
  if (!existing || existing.company_id !== req.user.company_id) {
    return res.status(404).json({ error: "Service not found" });
  }
  await db.remove("maintenance", existing.id);
  const left = (await db.fetchAll("maintenance", req.user.company_id)).some(
    (row) => row.vehicle_id === existing.vehicle_id && row.status !== "completed",
  );
  if (!left) {
    await db.update("vehicles", existing.vehicle_id, { service_paused: true });
  }
  res.json({ ok: true });
});

app.post("/api/documents", requireAuth, async (req, res) => {
  const row = await db.insert("documents", {
    company_id: req.user.company_id,
    title: req.body.title,
    type: req.body.type || req.body.category || "file",
    category: req.body.category || "general",
    file_url: req.body.file_url || "",
    uploaded_by: req.user.id,
    uploaded_by_name: req.user.full_name || req.user.email,
  });
  res.json(row);
});

app.post("/api/supplies", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const row = await db.insert("supplies", {
    company_id: req.user.company_id,
    vehicle_id: req.body.vehicle_id || null,
    name: req.body.name,
    qty: Number(req.body.qty) || 0,
    unit: req.body.unit || "ea",
    location: req.body.location || "",
  });
  res.json(row);
});

app.post("/api/mechanics", requireAuth, requireRole("admin", "fleet_manager"), async (req, res) => {
  const row = await db.insert("mechanics", {
    company_id: req.user.company_id,
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

app.listen(config.port, () => {
  console.log(`Fleet21 API on http://localhost:${config.port} (${useSupabase ? "supabase" : "local"})`);
});
