import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
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
import { deleteAuthUser, signInAuth, upsertAuthUser } from "./supabaseAuth.js";
import { ensurePlatformAdmin } from "./platformAdmin.js";
import { dueAtForSchedule, dueAtToday, parseDueWeekday, zaDay } from "./zaTime.js";
import { persistUploads, uploadDir } from "./storage.js";
import {
  askBrightyWithChatGpt,
  beginBrightyChatGpt,
  brightyChatGptStatus,
  brightyChatGptCallbackOrigin,
  disconnectBrightyChatGpt,
  finishBrightyChatGpt,
  isLocalChatGptFlow,
} from "./brightyChatgpt.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const configured = Array.isArray(config.clientOrigin) ? config.clientOrigin : [config.clientOrigin];
    let localDevOrigin = false;
    if (process.env.NODE_ENV !== "production") {
      try {
        const parsed = new URL(origin);
        localDevOrigin = parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
      } catch { localDevOrigin = false; }
    }
    callback(null, configured.includes(origin) || localDevOrigin);
  },
  credentials: true,
}));
app.use(express.json({ limit: "8mb" }));
app.use("/uploads", express.static(uploadDir));

const companyStatusOf = (row) => String(row?.status || "").trim().toLowerCase();

const loadCompany = async (companyId) => {
  if (!companyId) return null;
  const companies = await db.fetchAll("companies");
  return (
    companies.find((row) => String(row.id) === String(companyId) && !row.demo) ||
    companies.find((row) => String(row.id) === String(companyId)) ||
    null
  );
};

const isAwaitingCompanyApproval = (company) => {
  const companyStatus = companyStatusOf(company);
  return companyStatus === "pending" || companyStatus === "submitted";
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
  const company = await loadCompany(user.company_id);
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
    await ensurePlatformAdmin().catch((error) => console.error("[seed] platform admin", error.message));
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
    const company = await loadCompany(user.company_id);
    if (isAwaitingCompanyApproval(company)) {
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
  const company = await loadCompany(full?.company_id);
  if (isAwaitingCompanyApproval(company)) {
    return res.status(403).json({
      error: "This company has been submitted. Wait for a super admin to approve it.",
    });
  }
  res.json({ user: await sessionUser(full || req.user), mode: useSupabase ? "supabase" : "local" });
});

app.get("/api/company", requireAuth, async (req, res) => {
  const scoped = await db.hydrateProfile(req.user);
  let company = await loadCompany(scoped?.company_id || req.user.company_id);
  if (!company && req.user.role === "super_admin") {
    const ids = await companyIdsForUser(scoped || req.user);
    company = await loadCompany(ids[0]);
  }
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

app.post("/api/uploads", requireAuth, upload.array("files", 12), async (req, res) => {
  try {
    const urls = await persistUploads(req.files || []);
    if (!urls.length) return res.status(400).json({ error: "No files were received. Try a smaller photo." });
    res.json({ urls });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not store the photo." });
  }
});

const skipSeedRow = (row) =>
  Boolean(row?.demo) ||
  ["v-1", "v-2", "v-3", "c-1", "c-2", "c-3", "ex-1", "ex-2", "r-1", "r-2", "i-1", "m-1"].includes(row?.id);

const workspaceRows = async (table, user) => {
  if (isSuperUser(user)) {
    const companies = (await db.fetchAll("companies")).filter((company) => !company.demo);
    const packs = await Promise.all(companies.map((company) => db.fetchAll(table, company.id)));
    return packs.flat().filter((row) => !skipSeedRow(row) && row?.id !== "u-admin" && row?.id !== "u-driver");
  }
  return (await db.fetchAll(table, user.company_id)).filter(
    (row) => !skipSeedRow(row) && row?.id !== "u-admin" && row?.id !== "u-driver",
  );
};

app.get("/api/brighty/chatgpt/status", requireAuth, async (req, res) => {
  res.json(await brightyChatGptStatus(req.user.id, req));
});

app.post("/api/brighty/chatgpt/connect", requireAuth, async (req, res) => {
  try {
    const origin = req.get("origin") || "";
    const url = await beginBrightyChatGpt(req.user.id, origin, req, req.body?.new_account === true);
    res.json({ authorizationUrl: url });
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not start ChatGPT connection." });
  }
});

app.get("/api/brighty/chatgpt/callback", async (req, res) => {
  const callbackOrigin = brightyChatGptCallbackOrigin(req.query?.state);
  try {
    const result = await finishBrightyChatGpt(req.query);
    const target = new URL("/brighty-ai", result.origin);
    target.searchParams.set("chatgpt", "connected");
    res.redirect(target.toString());
  } catch (error) {
    const fallback = "http://localhost:5173/brighty-ai";
    const target = new URL("/brighty-ai", callbackOrigin || fallback);
    target.searchParams.set("chatgpt", "error");
    target.searchParams.set("message", String(error.message || "ChatGPT connection failed.").slice(0, 180));
    res.redirect(target.toString());
  }
});

app.post("/api/brighty/chatgpt/disconnect", requireAuth, async (req, res) => {
  if (!isLocalChatGptFlow(req)) return res.status(403).json({ error: "ChatGPT plan connections are only enabled for the local app." });
  try {
    await disconnectBrightyChatGpt(req.user.id);
    res.json({ connected: false });
  } catch {
    res.status(500).json({ error: "Could not disconnect the ChatGPT account." });
  }
});

const brightyConversationExpiry = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

app.get("/api/brighty/conversation", requireAuth, async (req, res) => {
  try {
    await db.purgeExpiredBrightyConversations();
    const conversation = await db.getBrightyConversation(req.user.id);
    if (!conversation) return res.json({ messages: [], expiresAt: null });
    if (new Date(conversation.expires_at).getTime() <= Date.now()) {
      await db.deleteBrightyConversation(req.user.id);
      return res.json({ messages: [], expiresAt: null });
    }
    res.json({ messages: conversation.messages || [], expiresAt: conversation.expires_at });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not load Brighty conversation." });
  }
});

app.delete("/api/brighty/conversation", requireAuth, async (req, res) => {
  try {
    await db.deleteBrightyConversation(req.user.id);
    res.json({ messages: [], expiresAt: null });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not clear Brighty conversation." });
  }
});

app.post("/api/brighty/ask", requireAuth, async (req, res) => {
  const question = String(req.body?.question || "").trim().slice(0, 1200);
  if (!question) return res.status(400).json({ error: "Enter a question for Brighty." });
  if (!isLocalChatGptFlow(req)) return res.status(403).json({ error: "ChatGPT plan usage is not enabled for the hosted app yet." });
  let conversationMessages = null;
  try {
    await db.purgeExpiredBrightyConversations();
    const priorConversation = await db.getBrightyConversation(req.user.id);
    const storedMessages = priorConversation && new Date(priorConversation.expires_at).getTime() > Date.now()
      ? (Array.isArray(priorConversation.messages) ? priorConversation.messages : [])
      : [];
    const history = storedMessages
      .filter((item) => ["user", "assistant"].includes(item?.role) && typeof item?.content === "string" && !item.error)
      .slice(-12)
      .map((item) => ({ role: item.role, content: item.content.slice(0, 1200) }));
    conversationMessages = [...storedMessages, { role: "user", content: question, createdAt: new Date().toISOString() }];
    await db.saveBrightyConversation(req.user.id, conversationMessages, brightyConversationExpiry());
    const brightyOwner = isSuperUser(req.user);
    const mine = !brightyOwner && (req.user.role === "driver" || req.user.role_key === "driver");
    const modules = [
      ["vehicles", "vehicles"], ["checkins", "checkins"], ["expenses", "checkins"],
      ["incidents", "incidents"], ["reviews", "reviews"], ["maintenance", "maintenance"],
      ["mechanics", "mechanics"], ["profiles", "drivers", "drivers"],
      ["documents", "documents"], ["supplies", "supplies"], ["refuels", "refuels"],
      ["checkin_schedules", "checkins"], ["checkouts", "checkins"], ["notifications", "dashboard"],
      ["emails", "dashboard"], ["roles", "settings"],
    ];
    const rowsByTable = {};
    await Promise.all(modules.map(async ([table, permission, key = table]) => {
      if (brightyOwner || hasPermission(req.user, permission, "view")) rowsByTable[key] = await workspaceRows(table, req.user);
    }));
    if (mine && hasPermission(req.user, "dashboard", "view")) {
      rowsByTable.vehicles = await workspaceRows("vehicles", req.user);
      const ownProfile = (await db.fetchAll("profiles", req.user.company_id)).find((row) => String(row.id) === String(req.user.id));
      rowsByTable.ownProfile = ownProfile ? [ownProfile] : [];
    }
    const mineOnly = (rows) => mine ? rows.filter((row) => String(row.driver_id) === String(req.user.id) || String(row.logged_by) === String(req.user.id)) : rows;
    if (mine) for (const table of ["checkins", "expenses", "incidents", "reviews"]) if (rowsByTable[table]) rowsByTable[table] = mineOnly(rowsByTable[table]);
    const pick = (row, fields) => Object.fromEntries(fields.filter((key) => row?.[key] !== undefined && row?.[key] !== null).map((key) => [key, typeof row[key] === "string" ? row[key].slice(0, 500) : row[key]]));
    const workspaceCompany = brightyOwner
      ? null
      : await loadCompany(req.user.company_id).catch(() => null);
    const companyRows = brightyOwner
      ? (await db.fetchAll("companies")).filter((row) => !row.demo)
      : (workspaceCompany ? [workspaceCompany] : []);
    const companyNameById = new Map(companyRows.map((row) => [String(row.id), row.name || "Company"]));
    const vehicleRows = rowsByTable.vehicles || [];
    const driverProfile = rowsByTable.ownProfile?.[0] || (rowsByTable.drivers || []).find((row) => String(row.id) === String(req.user.id));
    const assignedVehicleIds = new Set(vehicleRows
      .filter((row) => String(row.assigned_driver_id || "") === String(req.user.id))
      .map((row) => String(row.id)));
    if (driverProfile?.assigned_vehicle_id) assignedVehicleIds.add(String(driverProfile.assigned_vehicle_id));
    const dashboardVehicles = mine
      ? vehicleRows.filter((row) => assignedVehicleIds.has(String(row.id)))
      : vehicleRows;
    const vehicleLabel = new Map(vehicleRows.map((row) => [String(row.id), row.registration || row.fleet_number || "Vehicle"]));
    const labelVehicle = (row) => row.registration || vehicleLabel.get(String(row.vehicle_id || "")) || "Unassigned";
    const safeBrightyRecord = (row) => Object.fromEntries(Object.entries(row || {}).filter(([key]) => {
      const field = key.toLowerCase();
      return !/(password|token|secret|api[_-]?key|authorization|id_number|national_id|proof_url|file_url|photo_url|avatar|picture|photos|slips|document_url)/.test(field)
        && field !== "address";
    }));
    const recentRows = (rows, fields, includeAllForOwner = true) => rows
      .slice()
      .sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0))
      .map((row) => ({
        ...(brightyOwner && includeAllForOwner ? safeBrightyRecord(row) : pick(row, fields)),
        ...(row.vehicle_id || row.registration ? { vehicle: labelVehicle(row) } : {}),
        ...(brightyOwner && (row.company_id || row.organisation_id) ? { company: companyNameById.get(String(row.company_id || row.organisation_id)) || "Unknown company" } : {}),
      }));
    const dashboardCheckins = rowsByTable.checkins || [];
    const dashboardExpenses = mine ? [] : (rowsByTable.expenses || []);
    const amountOf = (value) => {
      const amount = Number(value);
      return Number.isFinite(amount) ? amount : 0;
    };
    const checkinTotal = dashboardCheckins.reduce((sum, row) => sum + amountOf(row.amount), 0);
    const expenseTotal = dashboardExpenses.reduce((sum, row) => sum + amountOf(row.amount), 0);
    const monthOf = (value) => {
      if (!value || !Number.isFinite(new Date(value).getTime())) return "";
      return zaDay(value).slice(0, 7);
    };
    const monthTotals = (rows) => rows.reduce((totals, row) => {
      const key = monthOf(row.created_at || row.date);
      if (key) totals[key] = (totals[key] || 0) + amountOf(row.amount);
      return totals;
    }, {});
    const incomeByMonth = monthTotals(dashboardCheckins);
    const expenseByMonth = monthTotals(dashboardExpenses);
    const monthlyHistory = [...new Set([...Object.keys(incomeByMonth), ...Object.keys(expenseByMonth)])]
      .sort()
      .map((key) => {
        const income = incomeByMonth[key] || 0;
        const expenses = expenseByMonth[key] || 0;
        return { month: key, income, expenses, net: income - expenses };
      });
    const currentMonth = zaDay().slice(0, 7);
    const [year, month] = currentMonth.split("-").map(Number);
    const todayKey = zaDay();
    const todayNumber = Number(todayKey.slice(8, 10));
    const previousYearMonth = new Date(Date.UTC(year - 1, month - 1, 1));
    const previousYearMonthLastDay = new Date(Date.UTC(previousYearMonth.getUTCFullYear(), previousYearMonth.getUTCMonth() + 1, 0)).getUTCDate();
    const rolling12StartDate = new Date(Date.UTC(previousYearMonth.getUTCFullYear(), previousYearMonth.getUTCMonth(), Math.min(todayNumber, previousYearMonthLastDay)));
    const rolling12Start = rolling12StartDate.toISOString().slice(0, 10);
    const last12CalendarStart = new Date(Date.UTC(year - 1, month - 1, 1)).toISOString().slice(0, 10);
    const last12CalendarEnd = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);
    const yearToDateStart = `${year}-01-01`;
    const currentMonthStart = `${currentMonth}-01`;
    const sumWindow = (rows, startDate, endDate) => rows.reduce((sum, row) => {
      const dateValue = row.created_at || row.date;
      if (!dateValue || !Number.isFinite(new Date(dateValue).getTime())) return sum;
      const recordDate = zaDay(dateValue);
      return recordDate >= startDate && recordDate <= endDate ? sum + amountOf(row.amount) : sum;
    }, 0);
    const financeWindow = (startDate, endDate) => {
      const income = sumWindow(dashboardCheckins, startDate, endDate);
      const expenses = sumWindow(dashboardExpenses, startDate, endDate);
      return { startDate, endDate, income, expenses, net: income - expenses };
    };
    const recentMonths = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Date.UTC(year, month - 1 - (5 - index), 15));
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      const income = incomeByMonth[key] || 0;
      const expenses = expenseByMonth[key] || 0;
      return { month: key, income, expenses, net: income - expenses };
    });
    const previousMonthDate = new Date(Date.UTC(year, month - 2, 1));
    const previousMonthKey = `${previousMonthDate.getUTCFullYear()}-${String(previousMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const previousMonthIncome = incomeByMonth[previousMonthKey] || 0;
    const previousMonthExpenses = expenseByMonth[previousMonthKey] || 0;
    const financeByCompany = new Map();
    for (const row of [...dashboardCheckins.map((item) => ({ ...item, kind: "income" })), ...dashboardExpenses.map((item) => ({ ...item, kind: "expense" }))]) {
      const companyId = String(row.company_id || row.organisation_id || "");
      const company = companyNameById.get(companyId) || workspaceCompany?.name || "Unassigned company";
      const totals = financeByCompany.get(companyId || company) || { company, checkins: 0, income: 0, expenses: 0, byMonth: {} };
      const value = amountOf(row.amount);
      const monthKey = monthOf(row.created_at || row.date);
      if (row.kind === "income") {
        totals.checkins += 1;
        totals.income += value;
        if (monthKey) totals.byMonth[monthKey] = { ...(totals.byMonth[monthKey] || { income: 0, expenses: 0 }), income: (totals.byMonth[monthKey]?.income || 0) + value };
      } else {
        totals.expenses += value;
        if (monthKey) totals.byMonth[monthKey] = { ...(totals.byMonth[monthKey] || { income: 0, expenses: 0 }), expenses: (totals.byMonth[monthKey]?.expenses || 0) + value };
      }
      financeByCompany.set(companyId || company, totals);
    }
    const companyFinance = [...financeByCompany.values()].map(({ byMonth, ...totals }) => {
      const prior = byMonth[previousMonthKey] || { income: 0, expenses: 0 };
      return { ...totals, net: totals.income - totals.expenses, previousCalendarMonth: { month: previousMonthKey, income: prior.income, expenses: prior.expenses, net: prior.income - prior.expenses } };
    });
    const expenseCategories = dashboardExpenses.reduce((totals, row) => {
      const category = String(row.category || row.type || "Uncategorised").slice(0, 80);
      totals[category] = (totals[category] || 0) + amountOf(row.amount);
      return totals;
    }, {});
    const countBy = (rows, field) => rows.reduce((totals, row) => {
      const value = String(row[field] || "Unspecified").slice(0, 80);
      totals[value] = (totals[value] || 0) + 1;
      return totals;
    }, {});
    const maintenanceRows = rowsByTable.maintenance || [];
    const maintenanceCost = maintenanceRows.reduce((sum, row) => sum + amountOf(row.cost ?? row.amount), 0);
    const reviewRatings = (rowsByTable.reviews || []).map((row) => row.rating === null || row.rating === undefined || row.rating === "" ? NaN : Number(row.rating)).filter(Number.isFinite);
    const vehicleFinance = new Map();
    for (const row of [...dashboardCheckins.map((item) => ({ ...item, kind: "income" })), ...dashboardExpenses.map((item) => ({ ...item, kind: "expense" }))]) {
      const name = labelVehicle(row);
      const company = companyNameById.get(String(row.company_id || "")) || "";
      const financeKey = brightyOwner ? `${company}::${name}` : name;
      const result = vehicleFinance.get(financeKey) || { ...(brightyOwner ? { company } : {}), vehicle: name, checkins: 0, income: 0, expenses: 0 };
      if (row.kind === "income") {
        result.checkins += 1;
        result.income += amountOf(row.amount);
      } else result.expenses += amountOf(row.amount);
      vehicleFinance.set(financeKey, result);
    }
    const dueServices = (brightyOwner || hasPermission(req.user, "dashboard", "view"))
      ? (await listDecoratedServices(brightyOwner ? { ...req.user, role: "super_admin" } : req.user)).filter((row) => row.due && (!mine || assignedVehicleIds.has(String(row.vehicle_id))))
      : [];
    const pendingCompanies = brightyOwner
      ? companyRows.filter((row) => String(row.status || "").toLowerCase() === "pending").map((row) => pick(row, ["name", "city", "status", "created_at"]))
      : [];
    const driverRows = rowsByTable.drivers || [];
    const driversById = new Map(driverRows.map((row) => [String(row.id), row.full_name || row.name || "Driver"]));
    const business = {
      provider: "Brightbyte",
      providerDescription: "Brightbyte is our company and provides fleet services.",
      platform: "Fleet21",
      platformDescription: "Fleet21 is Brightbyte’s fleet operations platform for managing vehicles, drivers, check-ins, expenses, incidents, reviews, and maintenance.",
      customerWorkspace: workspaceCompany?.name || req.user.company_name || "",
    };
    const context = {
      asOfDate: zaDay(),
      currency: "ZAR",
      business,
      companies: {
        scope: brightyOwner ? "all customer workspaces in Fleet21" : "this signed-in user's permitted workspace",
        total: companyRows.length,
        active: companyRows.filter((row) => String(row.status || "active").toLowerCase() === "active").length,
        pending: brightyOwner ? pendingCompanies.length : companyRows.filter((row) => String(row.status || "").toLowerCase() === "pending").length,
        workspaces: brightyOwner ? companyRows.map((row) => pick(row, ["name", "city", "status", "created_at"])) : [],
      },
      dashboard: {
        viewer: mine ? "driver" : "operations",
        dataScope: "Metrics below are computed from all non-demo records visible to this signed-in user. Recent record lists are samples of the latest records; aggregate totals use the full available history.",
        kpis: {
          vehicles: dashboardVehicles.length,
          vehiclesInUse: dashboardVehicles.filter((row) => row.assigned_driver_id || row.status === "in_use").length,
          checkins: dashboardCheckins.length,
          reviews: (rowsByTable.reviews || []).length,
          checkinTotal: mine ? 0 : checkinTotal,
          revenue: mine ? 0 : checkinTotal - expenseTotal,
          expenseTotal: mine ? 0 : expenseTotal,
          profitTotal: mine ? 0 : checkinTotal - expenseTotal,
          servicesDue: dueServices.length,
          openIncidents: (rowsByTable.incidents || []).filter((row) => String(row.status || "").toLowerCase() === "open").length,
          pendingReviews: (rowsByTable.reviews || []).filter((row) => String(row.status || "").toLowerCase() === "submitted").length,
        },
        finance: mine ? null : {
          calculation: "Check-in amount total minus expense amount total; this matches the Fleet21 dashboard’s finance calculation.",
          totals: { checkinIncome: checkinTotal, expenses: expenseTotal, net: checkinTotal - expenseTotal },
          previousCalendarMonth: { month: previousMonthKey, income: previousMonthIncome, expenses: previousMonthExpenses, net: previousMonthIncome - previousMonthExpenses },
          periods: {
            rolling12Months: financeWindow(rolling12Start, todayKey),
            last12CompleteCalendarMonths: financeWindow(last12CalendarStart, last12CalendarEnd),
            previousCalendarYear: financeWindow(`${year - 1}-01-01`, `${year - 1}-12-31`),
            calendarYearToDate: financeWindow(yearToDateStart, todayKey),
            currentMonthToDate: financeWindow(currentMonthStart, todayKey),
          },
          recentMonths,
          monthlyHistory,
          expensesByCategory: Object.entries(expenseCategories).map(([category, amount]) => ({ category, amount })),
          byCompany: companyFinance,
          byVehicle: [...vehicleFinance.values()].map((row) => ({ ...row, net: row.income - row.expenses })),
        },
        recordCounts: {
          vehicles: dashboardVehicles.length,
          checkins: dashboardCheckins.length,
          expenses: dashboardExpenses.length,
          incidents: (rowsByTable.incidents || []).length,
          reviews: (rowsByTable.reviews || []).length,
          maintenance: (rowsByTable.maintenance || []).length,
          mechanics: (rowsByTable.mechanics || []).length,
          drivers: driverRows.length,
          documents: (rowsByTable.documents || []).length,
          supplies: (rowsByTable.supplies || []).length,
          refuels: (rowsByTable.refuels || []).length,
          checkinSchedules: (rowsByTable.checkin_schedules || []).length,
          checkouts: (rowsByTable.checkouts || []).length,
          notifications: (rowsByTable.notifications || []).length,
          emailLogs: (rowsByTable.emails || []).length,
          roles: (rowsByTable.roles || []).length,
        },
        operationalBreakdowns: {
          vehiclesByStatus: countBy(dashboardVehicles, "status"),
          incidentsByStatus: countBy(rowsByTable.incidents || [], "status"),
          incidentsByType: countBy(rowsByTable.incidents || [], "type"),
          reviewsByStatus: countBy(rowsByTable.reviews || [], "status"),
          averageReviewRating: reviewRatings.length ? reviewRatings.reduce((sum, rating) => sum + rating, 0) / reviewRatings.length : null,
          maintenanceCostTotal: maintenanceCost,
          fuel: {
            refuelCount: (rowsByTable.refuels || []).length,
            litres: (rowsByTable.refuels || []).reduce((sum, row) => sum + amountOf(row.litres), 0),
            spend: (rowsByTable.refuels || []).reduce((sum, row) => sum + amountOf(row.amount), 0),
            byCompany: (rowsByTable.refuels || []).reduce((totals, row) => {
              const company = companyNameById.get(String(row.company_id || row.organisation_id || "")) || "Unassigned company";
              const entry = totals[company] || { company, refuels: 0, litres: 0, spend: 0 };
              entry.refuels += 1;
              entry.litres += amountOf(row.litres);
              entry.spend += amountOf(row.amount);
              totals[company] = entry;
              return totals;
            }, {}),
          },
          checkinSchedules: {
            total: (rowsByTable.checkin_schedules || []).length,
            active: (rowsByTable.checkin_schedules || []).filter((row) => row.active !== false).length,
          },
          checkoutsByStatus: countBy(rowsByTable.checkouts || [], "status"),
          maintenanceByType: maintenanceRows.reduce((totals, row) => {
            const type = String(row.service_type || row.service_name || "Unspecified").slice(0, 80);
            totals[type] = (totals[type] || 0) + amountOf(row.cost ?? row.amount);
            return totals;
          }, {}),
          maintenanceByCompany: maintenanceRows.reduce((totals, row) => {
            const company = companyNameById.get(String(row.company_id || row.organisation_id || "")) || "Unassigned company";
            const entry = totals[company] || { company, jobs: 0, cost: 0 };
            entry.jobs += 1;
            entry.cost += amountOf(row.cost ?? row.amount);
            totals[company] = entry;
            return totals;
          }, {}),
        },
        pendingCompanies,
      },
      vehicles: dashboardVehicles.map((row) => ({ ...(brightyOwner ? safeBrightyRecord(row) : pick(row, ["registration", "make", "model", "year", "status", "odometer", "last_service_odometer", "last_service_at", "created_at"])), ...(brightyOwner ? { company: companyNameById.get(String(row.company_id || row.organisation_id || "")) || "Unknown company" } : {}), assignedDriver: driversById.get(String(row.assigned_driver_id || "")) || "" })),
      checkins: recentRows(dashboardCheckins, ["created_at", "date", "amount", "status", "record_type", "notes"]),
      expenses: recentRows(dashboardExpenses, ["created_at", "date", "amount", "status", "category", "type", "description"]),
      incidents: recentRows(rowsByTable.incidents || [], ["created_at", "date", "status", "type", "severity", "description"]),
      reviews: recentRows(rowsByTable.reviews || [], ["created_at", "date", "status", "rating", "condition", "notes"]),
      maintenance: recentRows(rowsByTable.maintenance || [], ["created_at", "date", "status", "service_type", "service_name", "amount", "cost", "due_date", "completed_at", "odometer", "workshop"]),
      servicesDue: dueServices.map((row) => ({
        ...pick({ ...row, registration: labelVehicle(row) }, ["registration", "title", "status", "next_due_date", "next_due_km", "km_left", "kmDue", "timeDue", "interval_km", "interval_months"]),
        ...(brightyOwner && row.company_id ? { company: companyNameById.get(String(row.company_id)) || "Unknown company" } : {}),
      })),
      mechanics: recentRows(rowsByTable.mechanics || [], ["name", "specialty", "status"]),
      drivers: driverRows.map((row) => ({
        ...pick(row, ["full_name", "role", "status"]),
        ...(brightyOwner ? { company: companyNameById.get(String(row.company_id || row.organisation_id || "")) || "Unknown company" } : {}),
        assignedVehicle: vehicleLabel.get(String(row.assigned_vehicle_id || "")) || "",
      })),
      dataCoverage: brightyOwner ? "Platform owner access: all non-demo companies and operational records across Fleet21, including finance, fleet, check-ins, checkouts, refuels, reviews, incidents, service, supplies, documents, schedules, staff, roles, notifications, and email log metadata. Lists contain the newest records when the full context exceeds the model size limit; dashboard aggregates use the full available history. Authentication credentials, password hashes, government ID numbers, document file contents, and email message bodies are excluded." : "Only non-demo operational records and fields available to this signed-in user's permissions are included.",
      checkinSchedules: recentRows(rowsByTable.checkin_schedules || [], ["due_weekday", "due_time", "late_fee", "expected_amount", "active", "notify", "created_at"]),
      checkouts: recentRows(rowsByTable.checkouts || [], ["km_out", "km_in", "status", "created_at", "returned_at"]),
      refuels: recentRows(rowsByTable.refuels || [], ["litres", "amount", "station", "created_at"]),
      supplies: recentRows(rowsByTable.supplies || [], ["name", "qty", "unit", "location", "created_at"]),
      documents: recentRows(rowsByTable.documents || [], ["title", "type", "category", "description", "uploaded_by_name", "created_at"]),
      notifications: recentRows(rowsByTable.notifications || [], ["title", "body", "read", "created_at"]),
      emailLogs: recentRows(rowsByTable.emails || [], ["to", "subject", "created_at"], false),
      roleConfiguration: (rowsByTable.roles || []).map((row) => pick(row, ["RoleID", "RoleName", "key", "description", "Permissions", "permissionsMatrix", "state"])),
    };
    const result = await askBrightyWithChatGpt({ userId: req.user.id, question, history, context });
    conversationMessages.push({ role: "assistant", content: String(result.answer || ""), model: result.model || "", createdAt: new Date().toISOString() });
    await db.saveBrightyConversation(req.user.id, conversationMessages, brightyConversationExpiry());
    res.json(result);
  } catch (error) {
    const message = String(error?.message || "Brighty could not answer just now.").slice(0, 360);
    if (conversationMessages) {
      try {
        conversationMessages.push({ role: "assistant", content: message, error: true, createdAt: new Date().toISOString() });
        await db.saveBrightyConversation(req.user.id, conversationMessages, brightyConversationExpiry());
      } catch (saveError) {
        console.error("[Brighty] could not save failed response", saveError.message);
      }
    }
    res.status(message.includes("usage limit") || message.includes("plan cannot") ? 429 : 502).json({ error: message });
  }
});

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
        inUse: assignedVehicles.filter((v) => v.assigned_driver_id || v.status === "in_use").length,
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
  const photo =
    p?.photo_url || p?.avatar_url || p?.image_url || p?.photo || p?.profile_photo || p?.picture || "";
  return {
    ...db.publicUser(p),
    photo_url: photo,
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

const sameId = (left, right) =>
  String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase() && Boolean(left);

const isSuperUser = (user) =>
  user?.role === "super_admin" ||
  user?.role_key === "super_admin" ||
  user?.role_id === "R000" ||
  String(user?.email || "").trim().toLowerCase() ===
    String(config.platformAdminEmail || "admin@brightbyte.co.za").trim().toLowerCase() ||
  String(user?.email || "").trim().toLowerCase() === "admin@brightbyte.co.za";

const nextVehicleNumber = (rows = []) => {
  const max = rows.reduce((n, row) => {
    const match = String(row.number ?? row.vehicle_number ?? "").match(/(\d+)/);
    return match ? Math.max(n, Number(match[1])) : n;
  }, 0);
  return String(max + 1).padStart(5, "0");
};

const companyScopeOk = (user, companyId, row = null) => {
  if (isSuperUser(user)) return true;
  const userIds = [user?.company_id, user?.organisation_id].filter(Boolean);
  const targetIds = [companyId, row?.id, row?.organisation_id, row?.company_id].filter(Boolean);
  return userIds.some((id) => targetIds.some((other) => sameId(id, other)));
};

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
  const scoped = await db.hydrateProfile(user);
  const companyId = scoped?.company_id || user.company_id;
  const [people, vehicles] = await Promise.all([
    db.fetchAll("profiles", companyId),
    db.fetchAll("vehicles", companyId),
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
  res.json(
    people
      .filter((p) => String(p.role || "").toLowerCase() !== "super_admin")
      .map((p) => mapUser(p, vehicles)),
  );
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
    if (existing.role === "super_admin" || existing.role_key === "super_admin") {
      return res.status(400).json({ error: "The super admin account cannot be deleted." });
    }
    const links = [
      ["vehicles", "assigned_driver_id"],
      ["checkins", "driver_id"],
      ["expenses", "driver_id"],
      ["checkin_schedules", "driver_id"],
      ["reviews", "driver_id"],
      ["incidents", "driver_id"],
      ["incidents", "logged_by"],
      ["refuels", "driver_id"],
      ["documents", "uploaded_by"],
      ["notifications", "user_id"],
    ];
    for (const [table, column] of links) {
      await db.clearMatches(table, column, existing.id).catch((error) => {
        console.error("[delete user]", table, column, error.message);
      });
    }
    await db.remove("profiles", existing.id);
    await deleteAuthUser(existing.id).catch((error) => console.error("[delete user] auth", error.message));
    res.json({ ok: true });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

const asRoleRow = (row, companyId) => ({
  ...row,
  id: row.id || `${companyId || "platform"}-${row.RoleID || row.roleid || "role"}`,
  company_id: row.company_id || companyId,
  RoleID: row.RoleID || row.roleid,
  RoleName: row.RoleName || row.rolename,
  Permissions: row.Permissions || row.permissions,
  permissionsMatrix: row.permissionsMatrix || row.permissionsmatrix || {},
  description: row.description || "",
  state: row.state || "active",
  key: row.key,
});

const roleTemplateRows = (companyId) =>
  ROLE_TEMPLATES.map((template) =>
    asRoleRow(
      {
        ...template,
        company_id: companyId,
        state: "active",
        isSystem: true,
      },
      companyId,
    ),
  );

const seedRolesForCompany = async (companyId) => {
  if (!companyId) return roleTemplateRows("");
  try {
    const rows = await db.fetchAll("roles", companyId);
    if (rows.length) return rows.map((row) => asRoleRow(row, companyId));
    for (const template of ROLE_TEMPLATES) {
      await db
        .insert("roles", {
          company_id: companyId,
          RoleID: template.RoleID,
          RoleName: template.RoleName,
          key: template.key,
          description: template.description,
          Permissions: template.Permissions,
          permissionsMatrix: template.permissionsMatrix || {},
          state: "active",
          isSystem: false,
        })
        .catch((error) => console.error("[roles] seed", error.message));
    }
    const seeded = await db.fetchAll("roles", companyId);
    return seeded.length ? seeded.map((row) => asRoleRow(row, companyId)) : roleTemplateRows(companyId);
  } catch (error) {
    console.error("[roles] load", error.message);
    return roleTemplateRows(companyId);
  }
};

const rolesCompanyId = async (user, body = {}) => {
  const scoped = await db.hydrateProfile(user);
  if (user.role !== "super_admin") return scoped?.company_id || user.company_id;
  if (body.company_id) return body.company_id;
  const ids = await companyIdsForUser(scoped || user);
  return ids[0] || scoped?.company_id || user.company_id;
};

const nextRoleCode = (rows) => {
  const max = rows.reduce((n, row) => {
    const match = String(row.RoleID || "").match(/^R(\d+)$/i);
    return match ? Math.max(n, Number(match[1])) : n;
  }, 0);
  return `R${String(max + 1).padStart(3, "0")}`;
};

app.get("/api/roles", requireAuth, async (req, res) => {
  try {
    if (!hasPermission(req.user, "roles-rights", "view") && !hasPermission(req.user, "drivers", "view")) {
      return res.status(403).json({ error: "Not allowed for this role" });
    }
    const scoped = await db.hydrateProfile(req.user);
    if (req.user.role === "super_admin") {
      const ids = await companyIdsForUser(scoped || req.user);
      if (!ids.length) return res.json(await seedRolesForCompany(scoped?.company_id));
      const packs = await Promise.all(ids.map((id) => seedRolesForCompany(id)));
      return res.json(packs.flat());
    }
    res.json(await seedRolesForCompany(scoped?.company_id || req.user.company_id));
  } catch (error) {
    console.error("[roles] list", error.message);
    res.json(await seedRolesForCompany(req.user?.company_id));
  }
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

app.patch("/api/companies/:id", requireAuth, async (req, res) => {
  if (!hasPermission(req.user, "companies", "edit") && !hasPermission(req.user, "settings", "edit")) {
    return res.status(403).json({ error: "Not allowed for this role" });
  }
  const existing = await db.getById("companies", req.params.id);
  if (!existing) return res.status(404).json({ error: "Company not found" });
  const patch = {};
  ["name", "code", "city", "address", "contact_email", "photo_url", "status"].forEach((key) => {
    if (req.body?.[key] !== undefined) patch[key] = req.body[key];
  });
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
  if (!companyScopeOk(req.user, row.company_id)) {
    return res.status(404).json({ error: "Document not found" });
  }
  const url = String(row.file_url || "");
  if (/^https?:\/\//i.test(url)) return res.redirect(url);
  const match = url.match(/\/uploads\/([^/?#]+)/);
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
    const scoped = (await db.hydrateProfile(req.user)) || req.user;
    const actor = { ...req.user, company_id: scoped.company_id || req.user.company_id };
    const companyId = req.body.company_id || actor.company_id;
    const company = await db.getById("companies", companyId);
    if (!company || company.demo) return res.status(400).json({ error: "Select a valid company" });
    const ownsCompany =
      isSuperUser(actor) ||
      companyScopeOk(actor, company.id, company) ||
      (actor.email &&
        company.contact_email &&
        String(actor.email).trim().toLowerCase() === String(company.contact_email).trim().toLowerCase());
    if (!ownsCompany) {
      return res.status(403).json({ error: "Not allowed for this company" });
    }
    const registration = String(req.body.registration || "").trim();
    if (!registration) return res.status(400).json({ error: "Registration is required" });
    const photos = Array.isArray(req.body.photos) ? req.body.photos : [];
    if (photos.length < 5) return res.status(400).json({ error: "Upload at least five vehicle photos" });
    const licence = String(req.body.licence_expiry || "").replace(/\//g, "-");
    const payload = {
      company_id: company.id,
      registration,
      make: req.body.make || "",
      model: req.body.model || "",
      year: Number(req.body.year) || null,
      vin: req.body.vin || "",
      colour: req.body.colour || "",
      fuel_type: req.body.fuel_type || "",
      engine: req.body.engine || "",
      licence_expiry: licence,
      status: req.body.status || "available",
      odometer: Number(req.body.odometer) || 0,
      value: Number(req.body.value) || 0,
      photo_url: req.body.photo_url || photos[0] || "",
      photos,
    };
    if (company.organisation_id) payload.organisation_id = company.organisation_id;
    const row = await db.insert("vehicles", payload);
    evaluateCompanyServices(company.id).catch((error) => console.error("[vehicles] service", error.message));
    res.json(row);
  } catch (error) {
    const message = [error.message, error.details, error.hint].filter(Boolean).join(" — ");
    res.status(500).json({ error: message || "Could not save the vehicle" });
  }
});

app.patch("/api/vehicles/:id", requireAuth, requirePermission("vehicles", "edit"), async (req, res) => {
  const existing = await db.getById("vehicles", req.params.id);
  if (!existing || isDemoVehicle(existing) || !companyScopeOk(req.user, existing.company_id, existing)) {
    return res.status(404).json({ error: "Vehicle not found" });
  }
  const patch = {};
  [
    "registration",
    "make",
    "model",
    "year",
    "vin",
    "colour",
    "fuel_type",
    "engine",
    "licence_expiry",
    "status",
    "odometer",
    "value",
    "assigned_driver_id",
    "photo_url",
    "photos",
    "documents",
    "number",
    "vehicle_number",
    "company_id",
  ].forEach((key) => {
    if (req.body?.[key] !== undefined) patch[key] = req.body[key];
  });
  if (!isSuperUser(req.user)) delete patch.company_id;
  if (patch.year !== undefined) patch.year = Number(patch.year) || null;
  if (patch.odometer !== undefined) patch.odometer = Number(patch.odometer) || 0;
  if (patch.value !== undefined) patch.value = Number(patch.value) || 0;
  if (Array.isArray(patch.photos) && patch.photos.length < 5) {
    return res.status(400).json({ error: "Upload at least five vehicle photos" });
  }
  const row = await db.update("vehicles", req.params.id, patch);
  if (patch.odometer !== undefined) await evaluateCompanyServices(row.company_id);
  res.json(row);
});

app.delete("/api/vehicles/:id", requireAuth, requirePermission("vehicles", "delete"), async (req, res) => {
  try {
    const existing = await db.getById("vehicles", req.params.id);
    if (!existing || isDemoVehicle(existing) || !companyScopeOk(req.user, existing.company_id)) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    const links = [
      ["profiles", "assigned_vehicle_id"],
      ["checkins", "vehicle_id"],
      ["expenses", "vehicle_id"],
      ["checkin_schedules", "vehicle_id"],
      ["reviews", "vehicle_id"],
      ["incidents", "vehicle_id"],
      ["maintenance", "vehicle_id"],
      ["refuels", "vehicle_id"],
      ["supplies", "vehicle_id"],
      ["mechanics", "vehicle_id"],
      ["documents", "vehicle_id"],
    ];
    for (const [table, column] of links) {
      await db.clearMatches(table, column, existing.id).catch((error) => {
        console.error("[delete vehicle]", table, column, error.message);
      });
    }
    await db.remove("vehicles", req.params.id);
    res.json({ ok: true });
  } catch (error) {
    const message = [error.message, error.details, error.hint].filter(Boolean).join(" — ");
    res.status(500).json({ error: message || "Could not delete this vehicle." });
  }
});

const assignVehicleToDriver = async (companyId, driverId, vehicleId) => {
  const vehicles = await db.fetchAll("vehicles", companyId);
  await Promise.all(
    vehicles
      .filter((v) => v.assigned_driver_id === driverId && v.id !== vehicleId)
      .map((v) => db.update("vehicles", v.id, { assigned_driver_id: null })),
  );
  if (vehicleId) {
    const current = vehicles.find((v) => v.id === vehicleId);
    if (!current) throw new Error("Vehicle not found");
    if (current.assigned_driver_id && current.assigned_driver_id !== driverId) {
      await db.update("profiles", current.assigned_driver_id, { assigned_vehicle_id: null });
    }
    await db.update("vehicles", vehicleId, { assigned_driver_id: driverId });
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
    const existing = await db.findUserByEmail(email).catch(() => null);
    let authUser = null;
    try {
      authUser = await upsertAuthUser({
        email,
        password: loginPassword,
        fullName,
        userId: existing?.id,
      });
    } catch (error) {
      console.error("[invite] auth", error.message);
    }
    const prior =
      existing ||
      (authUser?.id ? await db.getById("profiles", authUser.id).catch(() => null) : null);
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
      organisation_id: company.organisation_id || company.id,
    };
    const employeeId = prior?.employee_id || (await db.nextEmployeeId(company).catch(() => "EMP-001"));
    let row;
    if (prior?.id) {
      row = await db.update("profiles", prior.id, { ...profileFields, employee_id: employeeId });
    } else {
      try {
        row = await db.insert("profiles", {
          ...profileFields,
          ...(authUser?.id ? { id: authUser.id } : {}),
          employee_id: employeeId,
        });
      } catch (error) {
        const targetId = authUser?.id || prior?.id;
        if (!/23505|duplicate key/i.test(error.message) || !targetId) throw error;
        row = await db.update("profiles", targetId, profileFields);
      }
    }
    if (!row?.id) throw new Error("Could not save this user.");
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
      await assignVehicleToDriver(company.id, row.id, vehicleId).catch((error) =>
        console.error("[invite] vehicle", error.message),
      );
      const assigned = await db.getUser(row.id).catch(() => row);
      return res.json(db.publicUser(assigned || row));
    }
    res.json(db.publicUser(row));
  } catch (error) {
    const message = [error.message, error.details, error.hint].filter(Boolean).join(" — ");
    console.error("[invite]", message);
    res.status(500).json({ error: message || "Could not create this user." });
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
    const { companyId } = await resolveTenantCompany(req.user, {
      driverId,
      vehicleId: req.body.vehicle_id,
    });
    const km = Number(req.body.odometer);
    if (!Number.isFinite(km) || km < 0) {
      return res.status(400).json({ error: "Enter the odometer reading" });
    }
    const schedule = await scheduleForDriver(companyId, driverId);
    const lateFee = computeLateFee(schedule);
    const recent = await db.fetchAll("checkins", companyId).catch(() => []);
    const duplicate = recent.find((row) => {
      const age = Date.now() - new Date(row.created_at || 0).getTime();
      return (
        age >= 0 &&
        age < 2 * 60 * 1000 &&
        String(row.driver_id) === String(driverId) &&
        String(row.vehicle_id) === String(req.body.vehicle_id) &&
        Number(row.odometer) === km &&
        Number(row.cash_amount || row.amount) === amount &&
        String(row.proof_url || "") === String(req.body.proof_url || "")
      );
    });
    if (duplicate) return res.json(duplicate);
    let backdated = null;
    const isDriverUser = req.user.role === "driver" || req.user.role_key === "driver";
    if (!isDriverUser && req.body.checkin_date) {
      const when = new Date(req.body.checkin_date);
      if (Number.isNaN(when.getTime()) || when.getTime() > Date.now() + 60 * 1000) {
        return res.status(400).json({ error: "Enter a valid check-in date" });
      }
      backdated = when.toISOString();
    }
    const row = await db.insert("checkins", {
      ...(backdated ? { created_at: backdated } : {}),
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
  try {
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
      if (!Number.isFinite(km) || km < 0) {
        return res.status(400).json({ error: "Enter the odometer reading" });
      }
      allowed.odometer = Math.round(km);
    }
    const row = await db.update("checkins", req.params.id, allowed);
    if (allowed.odometer !== undefined || allowed.vehicle_id) {
      await syncVehicleOdometer(row.vehicle_id, row.odometer);
      await evaluateCompanyServices(row.company_id);
    }
    res.json(row);
  } catch (error) {
    const message = error.message || "Could not update this check-in.";
    const tooBig = /out of range for type integer/i.test(message);
    res.status(400).json({
      error: tooBig
        ? "Odometer is too large for the database column. In Supabase SQL editor, run the odometer bigint lines at the bottom of supabase/schema.sql, then save again."
        : message,
    });
  }
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
    let backdated = null;
    if (req.body.expense_date) {
      const when = new Date(req.body.expense_date);
      if (Number.isNaN(when.getTime()) || when.getTime() > Date.now() + 60 * 1000) {
        return res.status(400).json({ error: "Enter a valid expense date" });
      }
      backdated = when.toISOString();
    }
    const row = await db.insert("expenses", {
      ...(backdated ? { created_at: backdated } : {}),
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

ensurePlatformAdmin().catch((error) => console.error("[seed] platform admin", error.message));

export { app };

const onLambda = Boolean(process.env.LAMBDA_TASK_ROOT || process.env.NETLIFY);

if (!onLambda) {
  app.listen(config.port, () => {
    console.log(`Fleet21 API on http://localhost:${config.port} (${useSupabase ? "supabase" : "local"})`);
    tickNotifications();
    setInterval(tickNotifications, 10 * 60 * 1000);
    const purgeBrightyConversations = () => db.purgeExpiredBrightyConversations().catch((error) => console.error("[Brighty] conversation cleanup", error.message));
    purgeBrightyConversations();
    const conversationCleanup = setInterval(purgeBrightyConversations, 30 * 60 * 1000);
    conversationCleanup.unref?.();
  });
}
