import fs from "fs";
import path from "path";
import { moduleDir } from "./moduleDir.js";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { createClient } from "@supabase/supabase-js";
import { config, useSupabase } from "./config.js";
import { upsertAuthUser } from "./supabaseAuth.js";
import { MAKE_MODELS, vehicleYearList } from "./vehicleCatalog.js";
import { ROLE_TEMPLATES } from "./permissions.js";

const now = () => new Date().toISOString();

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));

const STATUS_TRIES = ["active", "available", "pending", "idle"];
const ROLE_TRIES = ["driver", "admin", "fleet_manager", "finance", "super_admin", "user", "member"];

const compactRow = (row) => {
  const next = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    next[key] = value;
  });
  return next;
};

const errorText = (error) =>
  [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" — ");

const missingSchemaColumn = (message) => {
  const match = String(message || "").match(/Could not find the '([^']+)' column/i);
  return match?.[1] || "";
};

const nullSchemaColumn = (message) => {
  const match = String(message || "").match(/null value in column "([^"]+)"/i);
  return match?.[1] || "";
};

const writeRemote = async (run) => {
  let payload = compactRow(run.payload);
  const blocked = new Set();
  let statusTry = 0;
  let last = "Could not write row";
  const seen = new Set();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await run.exec(payload);
    if (!error) return data;
    last = errorText(error) || last;
    if (seen.has(last)) break;
    seen.add(last);
    const missing = missingSchemaColumn(last);
    if (missing && Object.prototype.hasOwnProperty.call(payload, missing)) {
      delete payload[missing];
      continue;
    }
    const required = nullSchemaColumn(last);
    if (required && !blocked.has(required)) {
      if (required === "company_id" && payload.organisation_id) payload.company_id = payload.organisation_id;
      else if ((required === "organisation_id" || required === "organization_id") && payload.company_id) {
        payload[required] = payload.company_id;
      } else if (["number", "vehicle_number", "fleet_number", "unit_number"].includes(required)) {
        const n = Date.now() % 100000000;
        payload.number = n;
        payload.vehicle_number = String(n);
        payload[required] = required === "number" ? n : String(n);
      } else if (required === "status") payload.status = "available";
      else if (required === "odometer" || required === "value" || required === "year") payload[required] = 0;
      else if (required === "photos" || required === "documents") payload[required] = [];
      else if (required === "registration") payload.registration = "PENDING";
      else payload[required] = payload.company_id || 0;
      continue;
    }
    if (/duplicate key|unique constraint/i.test(last)) {
      if (/profiles_pkey|profiles_email|Key \(id\)|Key \(email\)/i.test(last)) break;
      const n = Date.now() % 100000000;
      payload.number = n;
      payload.vehicle_number = String(n);
      continue;
    }
    if (/generated always|cannot insert/i.test(last)) {
      delete payload.number;
      delete payload.vehicle_number;
      continue;
    }
    if (/invalid input syntax for type uuid/i.test(last)) {
      ["assigned_driver_id", "organisation_id", "organization_id"].forEach((key) => delete payload[key]);
      continue;
    }
    if (/foreign key|violates foreign key/i.test(last)) {
      if (/organisation/i.test(last)) {
        blocked.add("organisation_id");
        delete payload.organisation_id;
        delete payload.organization_id;
        continue;
      }
      delete payload.assigned_driver_id;
      continue;
    }
    if (/invalid input value for enum/i.test(last)) {
      if (/status/i.test(last)) {
        delete payload.status;
        continue;
      }
      break;
    }
    if (/invalid input syntax for type json/i.test(last)) {
      delete payload.documents;
      delete payload.ratings;
      delete payload.photos;
      continue;
    }
    if (/check constraint|violates check/i.test(last)) {
      if (/role/i.test(last) && statusTry < ROLE_TRIES.length) {
        payload.role = ROLE_TRIES[statusTry];
        statusTry += 1;
        continue;
      }
      if (statusTry < STATUS_TRIES.length) {
        payload.status = STATUS_TRIES[statusTry];
        statusTry += 1;
        continue;
      }
    }
    break;
  }
  throw new Error(last);
};

const seedPasswordHash = bcrypt.hashSync("fleet21", 10);

const memory = {
  companies: [
    {
      id: "co-1",
      name: "BrightByte",
      code: "",
      city: "",
      contact_email: "",
      status: "active",
      demo: true,
      created_at: now(),
    },
    {
      id: "co-2",
      name: "Metro Freight",
      code: "MTF",
      city: "Johannesburg",
      contact_email: "fleet@metro.local",
      status: "active",
      demo: true,
      created_at: now(),
    },
  ],
  roles: ROLE_TEMPLATES.map((role) => ({
    ...role,
    id: role.RoleID,
    company_id: "co-1",
    state: "active",
    isSystem: false,
    created_at: now(),
  })),
  profiles: [
    {
      id: "u-admin",
      company_id: "co-1",
      email: "admin@fleet21.local",
      full_name: "BrightByte",
      role: "super_admin",
      role_id: "R000",
      phone: "",
      employee_id: "",
      demo: true,
      status: "active",
      photo_url: "",
      last_login: new Date(Date.now() - 3600000).toISOString(),
      password_hash: seedPasswordHash,
      created_at: now(),
    },
    {
      id: "u-driver",
      company_id: "co-1",
      email: "driver@fleet21.local",
      full_name: "Lerato Dlamini",
      role: "driver",
      role_id: "R003",
      phone: "+27 83 441 2290",
      license_no: "GP-441229",
      license_expiry: "2027-04-12",
      license_codes: "C1, EB",
      prdp: "required",
      id_number: "9002145800083",
      address: "12 Bosch Street, Pretoria",
      employee_id: "APX-014",
      start_date: "2023-06-01",
      emergency_contact_name: "Sibusiso Dlamini",
      emergency_contact_number: "+27 72 118 4402",
      photo_url: "https://randomuser.me/api/portraits/women/44.jpg",
      documents: [
        {
          title: "ID document",
          category: "ID document",
          url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
        },
        {
          title: "Proof of banking",
          category: "Proof of banking",
          url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80",
        },
        {
          title: "Driver licence",
          category: "Driver licence",
          url: "https://images.unsplash.com/photo-1511919884226-fd3cad34687a?auto=format&fit=crop&w=800&q=80",
        },
        {
          title: "PrDP",
          category: "PrDP",
          url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80",
        },
      ],
      assigned_vehicle_id: "v-1",
      demo: true,
      ratings: [
        {
          score: 4,
          comment: "Steady Pretoria runs. Bumper contact at the depot pulled the safety score.",
          rater_id: "u-admin",
          rater_name: "Thabo Mokoena",
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
      ],
      last_login: new Date(Date.now() - 86400000 * 2).toISOString(),
      status: "active",
      password_hash: seedPasswordHash,
      created_at: now(),
    },
  ],
  vehicles: [
    {
      id: "v-1",
      company_id: "co-1",
      registration: "GP 12 FJ 441",
      make: "Toyota",
      model: "Hilux 2.8 GD-6",
      year: 2023,
      vin: "AHTFR22G501234567",
      colour: "Glacier White",
      fuel_type: "Diesel",
      engine: "2.8L turbo",
      licence_expiry: "2026-11-30",
      status: "in_use",
      odometer: 48210,
      value: 685000,
      assigned_driver_id: "u-driver",
      demo: true,
      photo_url:
        "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1200&q=80",
      photos: [
        "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
      ],
      documents: [
        { title: "Licence disc", category: "licence", url: "" },
        { title: "Insurance schedule", category: "insurance", url: "" },
      ],
      created_at: now(),
    },
    {
      id: "v-2",
      company_id: "co-1",
      registration: "GP 88 NX 019",
      make: "Isuzu",
      model: "D-Max 250",
      year: 2022,
      colour: "Splash White",
      fuel_type: "Diesel",
      engine: "2.5L",
      licence_expiry: "2027-02-14",
      status: "available",
      demo: true,
      odometer: 61002,
      value: 429000,
      assigned_driver_id: null,
      photo_url:
        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
      photos: [],
      documents: [{ title: "Licence disc", category: "licence", url: "" }],
      created_at: now(),
    },
    {
      id: "v-3",
      company_id: "co-1",
      registration: "GP 04 KT 778",
      make: "Ford",
      model: "Ranger 2.0",
      year: 2024,
      colour: "Meteor Grey",
      fuel_type: "Diesel",
      engine: "2.0L bi-turbo",
      licence_expiry: "2026-08-01",
      status: "maintenance",
      demo: true,
      odometer: 22140,
      value: 798000,
      assigned_driver_id: null,
      photo_url:
        "https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=1200&q=80",
      photos: [],
      documents: [
        { title: "Service invoice", category: "maintenance", url: "" },
      ],
      created_at: now(),
    },
  ],
  checkins: [
    {
      id: "c-1",
      demo: true,
      company_id: "co-1",
      driver_id: "u-driver",
      vehicle_id: "v-1",
      amount: 1850.5,
      note: "Friday cash-in from Pretoria run",
      proof_url:
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80",
      odometer: 48190,
      status: "approved",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "c-2",
      demo: true,
      company_id: "co-1",
      driver_id: "u-driver",
      vehicle_id: "v-1",
      amount: 2420,
      note: "Midrand drop-offs",
      proof_url:
        "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=800&q=80",
      odometer: 47610,
      status: "approved",
      created_at: new Date(Date.now() - 86400000 * 18).toISOString(),
    },
    {
      id: "c-3",
      demo: true,
      company_id: "co-1",
      driver_id: "u-driver",
      vehicle_id: "v-1",
      amount: 1680,
      note: "August week 2 collections",
      proof_url:
        "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800&q=80",
      odometer: 45220,
      status: "approved",
      created_at: new Date("2026-08-14T10:00:00").toISOString(),
      late_fee_applied: 0,
    },
  ],
  expenses: [
    {
      id: "ex-1",
      demo: true,
      company_id: "co-1",
      driver_id: "u-driver",
      vehicle_id: "v-1",
      amount: 1488.1,
      name: "fuel",
      note: "Diesel fill at Engen Menlyn",
      proof_url:
        "https://images.unsplash.com/photo-1544197150-b99a5804eeb9?auto=format&fit=crop&w=800&q=80",
      frequency: "once_off",
      status: "approved",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "ex-2",
      demo: true,
      company_id: "co-1",
      driver_id: "u-driver",
      vehicle_id: "v-1",
      amount: 450,
      name: "tracker",
      note: "Tracker subscription",
      proof_url: "",
      frequency: "monthly",
      status: "submitted",
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ],
  checkin_schedules: [
    {
      id: "sch-1",
      demo: true,
      company_id: "co-1",
      driver_id: "u-driver",
      vehicle_id: "v-1",
      due_weekday: "monday",
      due_time: "18:00",
      late_fee: 100,
      expected_amount: 1800,
      notify: true,
      active: true,
      created_at: now(),
    },
  ],
  emails: [],
  notifications: [
    {
      id: "n-1",
      company_id: "co-1",
      user_id: "u-driver",
      title: "Check-in due",
      body: "Cash check-in is due today at 18:00. A R100 late fee applies after that time.",
      read: false,
      created_at: now(),
    },
  ],
  reviews: [
    {
      id: "r-1",
      demo: true,
      company_id: "co-1",
      driver_id: "u-driver",
      vehicle_id: "v-1",
      review_month: "2026-09-01",
      condition: "good",
      notes: "Front bumper scuff, tyres even.",
      photos: [
        "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80",
      ],
      status: "reviewed",
      created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    },
    {
      id: "r-2",
      demo: true,
      company_id: "co-1",
      driver_id: "u-driver",
      vehicle_id: "v-1",
      review_month: "2026-10-01",
      condition: "fair",
      notes: "Windscreen chip, nearside door scratch.",
      photos: [
        "https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80",
      ],
      status: "submitted",
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ],
  checkouts: [
    {
      id: "co-out-1",
      company_id: "co-1",
      driver_id: "u-driver",
      vehicle_id: "v-1",
      km_out: 47800,
      km_in: null,
      status: "checked_out",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      returned_at: null,
    },
  ],
  incidents: [
    {
      id: "i-1",
      demo: true,
      company_id: "co-1",
      driver_id: "u-driver",
      vehicle_id: "v-1",
      kind: "incident",
      logged_by: "u-driver",
      title: "Minor bumper contact at depot",
      severity: "low",
      description: "Slow reverse into bollard. No injury.",
      photos: [],
      occurred_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      status: "open",
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
  ],
  maintenance: [
    {
      id: "m-1",
      demo: true,
      company_id: "co-1",
      vehicle_id: "v-1",
      title: "Service",
      interval_km: 10000,
      interval_months: 2,
      last_service_odometer: 38000,
      last_service_at: new Date(Date.now() - 86400000 * 75).toISOString(),
      status: "scheduled",
      slips: [],
      created_at: now(),
    },
  ],
  supplies: [
    {
      id: "s-1",
      company_id: "co-1",
      vehicle_id: "v-1",
      name: "Engine oil 5W-30",
      qty: 8,
      unit: "L",
      location: "Depot bay 2",
      demo: true,
      created_at: now(),
    },
    {
      id: "s-2",
      company_id: "co-1",
      vehicle_id: "v-1",
      name: "Oil filter",
      qty: 2,
      unit: "ea",
      location: "Parts cage",
      demo: true,
      created_at: now(),
    },
    {
      id: "s-3",
      company_id: "co-1",
      vehicle_id: "v-1",
      name: "Spare wheel",
      qty: 1,
      unit: "ea",
      location: "On vehicle",
      demo: true,
      created_at: now(),
    },
  ],
  mechanics: [
    {
      id: "mech-1",
      company_id: "co-1",
      full_name: "Andile Khumalo",
      trade: "Diesel mechanic",
      phone: "+27 82 441 7780",
      workshop: "Apex Depot, Pretoria",
      hours: "Mon–Sat 07:00–18:00",
      after_hours: true,
      demo: true,
      photo_url: "https://randomuser.me/api/portraits/men/75.jpg",
      created_at: now(),
    },
    {
      id: "mech-2",
      company_id: "co-1",
      full_name: "Naledi Molefe",
      trade: "Auto electrician",
      phone: "+27 71 220 1964",
      workshop: "Menlyn service bay",
      hours: "Mon–Fri 08:00–17:00",
      after_hours: false,
      demo: true,
      photo_url: "https://randomuser.me/api/portraits/women/65.jpg",
      created_at: now(),
    },
  ],
  documents: [
    {
      id: "d-1",
      demo: true,
      company_id: "co-1",
      title: "hilux-licence",
      type: "licence",
      category: "licence",
      file_url:
        "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
      uploaded_by: "u-admin",
      uploaded_by_name: "Thabo Mokoena",
      created_at: now(),
    },
    {
      id: "d-2",
      demo: true,
      company_id: "co-1",
      title: "driver-id-pack",
      type: "user",
      category: "user",
      file_url:
        "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&q=80",
      uploaded_by: "u-admin",
      uploaded_by_name: "Thabo Mokoena",
      created_at: now(),
    },
    {
      id: "d-3",
      demo: true,
      company_id: "co-1",
      title: "quantum-registration",
      type: "licence",
      category: "licence",
      file_url:
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80",
      uploaded_by: "u-admin",
      uploaded_by_name: "Thabo Mokoena",
      created_at: now(),
    },
    {
      id: "d-4",
      demo: true,
      company_id: "co-1",
      title: "workshop-training",
      type: "user",
      category: "user",
      file_url:
        "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80",
      uploaded_by: "u-admin",
      uploaded_by_name: "Thabo Mokoena",
      created_at: now(),
    },
    {
      id: "d-5",
      demo: true,
      company_id: "co-1",
      title: "incident-photos",
      type: "incident",
      category: "incident",
      file_url:
        "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=800&q=80",
      uploaded_by: "u-admin",
      uploaded_by_name: "Thabo Mokoena",
      created_at: now(),
    },
  ],
  vehicle_makes: Object.keys(MAKE_MODELS).map((name, index) => ({
    id: `make-${index + 1}`,
    name,
  })),
  vehicle_models: Object.entries(MAKE_MODELS).flatMap(([make, models], makeIndex) =>
    models.map((name, index) => ({
      id: `model-${makeIndex + 1}-${index + 1}`,
      make_id: `make-${makeIndex + 1}`,
      make,
      name,
    })),
  ),
  vehicle_years: vehicleYearList().map((year) => ({ id: `year-${year}`, year })),
  refuels: [
    {
      id: "f-1",
      company_id: "co-1",
      driver_id: "u-driver",
      vehicle_id: "v-1",
      litres: 62.4,
      amount: 1488.1,
      station: "Engen Menlyn",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};

const dataFile = path.join(moduleDir(import.meta.url), "..", "data", "local-store.json");

const LOCAL_TABLES = ["companies", "profiles", "vehicles", "supplies", "mechanics", "checkins", "expenses", "checkin_schedules", "reviews", "incidents", "maintenance", "documents", "roles", "notifications", "emails"];

const persistLocal = () => {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(
    dataFile,
    JSON.stringify(
      {
        companies: memory.companies.filter((row) => !row.demo),
        profiles: memory.profiles.filter((row) => !["u-admin", "u-driver"].includes(row.id)),
        platform: (() => {
          const company = memory.companies.find((row) => row.id === "co-1");
          const profile = memory.profiles.find((row) => row.id === "u-admin");
          return {
            company: company
              ? {
                  name: company.name || "",
                  code: company.code || "",
                  city: company.city || "",
                  contact_email: company.contact_email || "",
                  photo_url: company.photo_url || "",
                }
              : null,
            profile: profile
              ? {
                  full_name: profile.full_name || "",
                  phone: profile.phone || "",
                  photo_url: profile.photo_url || "",
                }
              : null,
          };
        })(),
        vehicles: memory.vehicles.filter((row) => !row.demo && !["v-1", "v-2", "v-3"].includes(row.id)),
        supplies: (memory.supplies || []).filter((row) => !row.demo),
        mechanics: (memory.mechanics || []).filter((row) => !row.demo),
        checkins: (memory.checkins || []).filter((row) => !row.demo && !["c-1", "c-2", "c-3"].includes(row.id)),
        expenses: (memory.expenses || []).filter((row) => !row.demo && !["ex-1", "ex-2"].includes(row.id)),
        checkin_schedules: (memory.checkin_schedules || []).filter((row) => !row.demo && row.id !== "sch-1"),
        reviews: (memory.reviews || []).filter((row) => !row.demo && !["r-1", "r-2"].includes(row.id)),
        incidents: (memory.incidents || []).filter((row) => !row.demo && row.id !== "i-1"),
        maintenance: (memory.maintenance || []).filter((row) => !row.demo && row.id !== "m-1"),
        documents: (memory.documents || []).filter((row) => !row.demo && !["d-1", "d-2", "d-3", "d-4", "d-5"].includes(row.id)),
        roles: (memory.roles || []).map((row) => ({ ...row, isSystem: false })),
        notifications: (memory.notifications || []).filter((row) => !row.demo),
        emails: (memory.emails || []).filter((row) => !row.demo),
      },
      null,
      2,
    ),
  );
};

try {
  const saved = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  if (saved.platform?.company) {
    const idx = memory.companies.findIndex((row) => row.id === "co-1");
    if (idx >= 0) {
      memory.companies[idx] = {
        ...memory.companies[idx],
        ...saved.platform.company,
        id: "co-1",
        demo: true,
      };
    }
  }
  if (saved.platform?.profile) {
    const idx = memory.profiles.findIndex((row) => row.id === "u-admin");
    if (idx >= 0) {
      memory.profiles[idx] = {
        ...memory.profiles[idx],
        ...saved.platform.profile,
        id: "u-admin",
        role: "super_admin",
        role_id: "R000",
        demo: true,
      };
    }
  }
  for (const company of saved.companies || []) {
    if (company.demo) continue;
    if (!memory.companies.some((row) => row.id === company.id || row.contact_email === company.contact_email)) {
      memory.companies.push(company);
    }
  }
  for (const user of saved.profiles || []) {
    if (!memory.profiles.some((row) => row.id === user.id || row.email?.toLowerCase() === user.email?.toLowerCase())) {
      memory.profiles.push(user);
    }
  }
  for (const vehicle of saved.vehicles || []) {
    if (vehicle.demo) continue;
    if (!memory.vehicles.some((row) => row.id === vehicle.id || row.registration === vehicle.registration)) {
      memory.vehicles.push(vehicle);
    }
  }
  for (const supply of saved.supplies || []) {
    if (supply.demo) continue;
    if (!(memory.supplies || []).some((row) => row.id === supply.id)) memory.supplies.push(supply);
  }
  for (const mechanic of saved.mechanics || []) {
    if (mechanic.demo) continue;
    if (!(memory.mechanics || []).some((row) => row.id === mechanic.id)) memory.mechanics.push(mechanic);
  }
  for (const table of ["checkins", "expenses", "checkin_schedules", "reviews", "incidents", "maintenance", "documents", "notifications", "emails"]) {
    for (const row of saved[table] || []) {
      if (row.demo) continue;
      if (!(memory[table] || []).some((item) => item.id === row.id)) memory[table].push(row);
    }
  }
  for (const role of saved.roles || []) {
    const idx = memory.roles.findIndex(
      (row) => row.id === role.id || (row.company_id === role.company_id && row.RoleID === role.RoleID),
    );
    if (idx >= 0) {
      memory.roles[idx] = { ...memory.roles[idx], ...role, isSystem: false };
    } else {
      memory.roles.push({ ...role, isSystem: false });
    }
  }
} catch {
  /* first run — no saved tenants yet */
}

let supabase = null;
if (useSupabase) {
  supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const publicUser = (row) => {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return rest;
};

export const db = {
  useSupabase,
  supabase,

  async hydrateProfile(row) {
    if (!row) return null;
    if (isUuid(row.company_id)) return row;
    if (row.email) {
      const found = await this.findUserByEmail(row.email);
      if (found?.company_id) return found;
    }
    if (isUuid(row.id)) {
      const fresh = await this.getUser(row.id);
      if (fresh?.company_id) return fresh;
    }
    return row;
  },

  async findUserByEmail(email) {
    const needle = String(email || "").trim().toLowerCase();
    if (!needle) return null;
    const same = (value) => String(value || "").trim().toLowerCase() === needle;
    const rowEmails = (row) => [row?.email, row?.Email, row?.email_address, row?.emailAddress];
    const matches = (row) => rowEmails(row).some((value) => same(value));
    const fromMemory = () => memory.profiles.find(matches);
    if (!useSupabase) return fromMemory() || null;
    const companies = await this.fetchAll("companies");
    for (const company of companies) {
      if (!company?.id || company.demo) continue;
      const people = await this.fetchAll("profiles", company.id);
      const hit = people.find(matches);
      if (hit) return hit;
    }
    return fromMemory() || null;
  },

  async getUser(id) {
    if (!useSupabase) return memory.profiles.find((p) => p.id === id);
    if (!isUuid(id)) return memory.profiles.find((p) => p.id === id) || null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data || memory.profiles.find((p) => p.id === id);
  },

  async listByRole(role) {
    if (!useSupabase) return memory.profiles.filter((p) => p.role === role);
    const { data, error } = await supabase.from("profiles").select("*").eq("role", role);
    if (error) throw error;
    const remote = data || [];
    const extras = memory.profiles.filter(
      (row) => row.role === role && !remote.some((item) => item.id === row.id),
    );
    return [...remote, ...extras];
  },

  async registerCompany({ companyName, fullName, email, password, address, role }) {
    const hash = bcrypt.hashSync(password, 10);
    const code = String(companyName).replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "CO";
    if (!useSupabase) {
      const company = {
        id: uuid(),
        name: companyName,
        code,
        address: address || "",
        city: "",
        contact_email: email,
        status: "pending",
        created_at: now(),
      };
      const user = {
        id: uuid(),
        company_id: company.id,
        email,
        full_name: fullName,
        role: role || "admin",
        role_id: "R001",
        status: "pending",
        password_hash: hash,
        created_at: now(),
      };
      memory.companies.push(company);
      memory.profiles.push(user);
      ROLE_TEMPLATES.forEach((template) => {
        memory.roles.push({
          ...template,
          id: uuid(),
          company_id: company.id,
          state: "active",
          isSystem: false,
          created_at: now(),
        });
      });
      persistLocal();
      return { company, user: publicUser(user) };
    }
    const { data: company, error: cErr } = await supabase
      .from("companies")
      .insert({
        name: companyName,
        code,
        address: address || "",
        contact_email: email,
        status: "pending",
      })
      .select()
      .single();
    if (cErr) throw cErr;
    const authUser = await upsertAuthUser({ email, password, fullName });
    const { data: user, error: uErr } = await supabase
      .from("profiles")
      .insert({
        ...(authUser?.id ? { id: authUser.id } : {}),
        company_id: company.id,
        email,
        full_name: fullName,
        role: role || "admin",
        role_id: "R001",
        status: "pending",
        password_hash: hash,
      })
      .select()
      .single();
    if (uErr) throw uErr;
    memory.companies.push(company);
    memory.profiles.push(user);
    ROLE_TEMPLATES.forEach((template) => {
      memory.roles.push({
        ...template,
        id: uuid(),
        company_id: company.id,
        state: "active",
        isSystem: false,
        created_at: now(),
      });
    });
    persistLocal();
    return { company, user: publicUser(user) };
  },

  list(table, companyId, extra = () => true) {
    return (memory[table] || []).filter((row) => row.company_id === companyId && extra(row));
  },

  async fetchAll(table, companyId) {
    if (!useSupabase) {
      if (table === "companies") return [...memory.companies];
      return this.list(table, companyId);
    }
    if (table !== "companies" && !isUuid(companyId)) {
      return this.list(table, companyId);
    }
    const map = {
      reviews: "vehicle_reviews",
    };
    const name = map[table] || table;
    let query = supabase.from(name).select("*");
    if (table !== "companies") query = query.eq("company_id", companyId);
    let { data, error } = await query.order("created_at", { ascending: false });
    if (error && table !== "companies" && /company_id/i.test(error.message)) {
      const retry = await supabase.from(name).select("*").eq("organisation_id", companyId).order("created_at", { ascending: false });
      data = retry.data;
      error = retry.error;
    }
    if (error) throw error;
    const remote = data || [];
    if (table === "companies") {
      const extras = memory.companies.filter(
        (row) =>
          !row.demo &&
          !remote.some((item) => item.id === row.id || item.contact_email === row.contact_email),
      );
      return [...remote, ...extras];
    }
    const extras = (memory[table] || []).filter(
      (row) => row.company_id === companyId && !remote.some((item) => item.id === row.id),
    );
    return [...remote, ...extras];
  },

  async insert(table, row) {
    const record = { id: uuid(), created_at: now(), ...row };
    if (!useSupabase) {
      if (!memory[table]) memory[table] = [];
      memory[table].unshift(record);
      if (LOCAL_TABLES.includes(table)) persistLocal();
      return record;
    }
    const map = { reviews: "vehicle_reviews" };
    const name = map[table] || table;
    const payload = await this.fitColumns(name, compactRow(row));
    return writeRemote({
      payload,
      exec: async (body) => {
        const { data, error } = await supabase.from(name).insert(body).select();
        if (error) return { data: null, error };
        const saved = Array.isArray(data) ? data[0] : data;
        return { data: saved || { ...body }, error: null };
      },
    });
  },

  async getById(table, id) {
    if (!useSupabase) return (memory[table] || []).find((r) => r.id === id) || null;
    if (!isUuid(id)) return (memory[table] || []).find((r) => r.id === id) || null;
    const map = { reviews: "vehicle_reviews" };
    const name = map[table] || table;
    const { data, error } = await supabase.from(name).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data || (memory[table] || []).find((r) => r.id === id) || null;
  },

  async update(table, id, patch) {
    if (!useSupabase || !isUuid(id)) {
      const idx = memory[table].findIndex((r) => r.id === id);
      if (idx < 0) return null;
      memory[table][idx] = { ...memory[table][idx], ...patch };
      if (LOCAL_TABLES.includes(table)) persistLocal();
      return memory[table][idx];
    }
    const map = { reviews: "vehicle_reviews" };
    const name = map[table] || table;
    const payload = await this.fitColumns(name, compactRow(patch));
    delete payload.id;
    return writeRemote({
      payload,
      exec: async (body) => {
        const { data, error } = await supabase.from(name).update(body).eq("id", id).select();
        if (error) return { data: null, error };
        const saved = Array.isArray(data) ? data[0] : data;
        return { data: saved || { id, ...body }, error: null };
      },
    });
  },

  async fitColumns(name, payload) {
    const sample = await supabase.from(name).select("*").limit(1);
    const keys = sample.data?.[0] ? Object.keys(sample.data[0]) : null;
    if (!keys?.length) return payload;
    const aliases = { vehicle_number: "number", organization_id: "organisation_id" };
    const next = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (keys.includes(key)) next[key] = value;
      else if (aliases[key] && keys.includes(aliases[key]) && next[aliases[key]] == null) next[aliases[key]] = value;
    });
    if (keys.includes("organisation_id") && !next.organisation_id && payload.company_id) {
      next.organisation_id = payload.company_id;
    }
    if (keys.includes("company_id") && !next.company_id && payload.organisation_id) {
      next.company_id = payload.organisation_id;
    }
    const photo = payload.photo_url || payload.avatar_url || payload.photo || payload.image_url;
    if (photo) {
      const photoKey = ["photo_url", "avatar_url", "image_url", "photo", "profile_photo", "picture"].find((key) =>
        keys.includes(key),
      );
      if (photoKey) next[photoKey] = photo;
    }
    return next;
  },

  async remove(table, id) {
    if (!useSupabase || !isUuid(id)) {
      const before = memory[table].length;
      memory[table] = memory[table].filter((r) => r.id !== id);
      if (LOCAL_TABLES.includes(table)) persistLocal();
      return before !== memory[table].length;
    }
    const map = { reviews: "vehicle_reviews" };
    const name = map[table] || table;
    const { error } = await supabase.from(name).delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  async nextEmployeeId(company) {
    const prefix =
      String(company?.code || company?.name || "EMP")
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase()
        .slice(0, 8) || "EMP";
    const people = await this.fetchAll("profiles", company.id);
    const highest = people.reduce((max, row) => {
      const match = String(row.employee_id || "").match(/(\d+)\s*$/);
      const n = match ? Number(match[1]) : 0;
      return n > max ? n : max;
    }, 0);
    return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
  },

  async listCatalog(table, make) {
    if (!useSupabase) {
      let rows = [...(memory[table] || [])];
      if (table === "vehicle_models" && make) {
        rows = rows.filter((row) => row.make === make || row.make_id === make);
      }
      if (table === "vehicle_years") return rows.sort((a, b) => b.year - a.year);
      return rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }
    if (table === "vehicle_years") {
      const { data, error } = await supabase.from("vehicle_years").select("*").order("year", { ascending: false });
      if (error) throw error;
      return data || [];
    }
    let query = supabase.from(table).select("*").order("name");
    if (table === "vehicle_models" && make) query = query.eq("make", make);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  publicUser,
};
