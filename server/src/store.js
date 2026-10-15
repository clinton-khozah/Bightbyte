import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { createClient } from "@supabase/supabase-js";
import { config, useSupabase } from "./config.js";

const now = () => new Date().toISOString();

const seedPasswordHash = bcrypt.hashSync("fleet21", 10);

const memory = {
  companies: [
    {
      id: "co-1",
      name: "Apex Logistics",
      code: "APX",
      city: "Pretoria",
      contact_email: "ops@apex.local",
      status: "active",
      created_at: now(),
    },
    {
      id: "co-2",
      name: "Metro Freight",
      code: "MTF",
      city: "Johannesburg",
      contact_email: "fleet@metro.local",
      status: "active",
      created_at: now(),
    },
  ],
  roles: [
    {
      id: "R001",
      company_id: "co-1",
      RoleID: "R001",
      RoleName: "System Administrator",
      description: "Full system access and configuration",
      Permissions: "All modules · full CRUD",
      state: "active",
      isSystem: true,
      permissionsMatrix: {},
      created_at: now(),
    },
    {
      id: "R002",
      company_id: "co-1",
      RoleID: "R002",
      RoleName: "Fleet Manager",
      description: "Manage fleet, assets, maintenance and reports",
      Permissions: "Assets · Check-in · Maintenance",
      state: "active",
      isSystem: true,
      permissionsMatrix: {},
      created_at: now(),
    },
    {
      id: "R003",
      company_id: "co-1",
      RoleID: "R003",
      RoleName: "Driver",
      description: "Check-in, reviews and assigned vehicle",
      Permissions: "Check-in · Reviews · Checkout",
      state: "active",
      isSystem: true,
      permissionsMatrix: {},
      created_at: now(),
    },
    {
      id: "R004",
      company_id: "co-1",
      RoleID: "R004",
      RoleName: "Read Only",
      description: "View operations without changing records",
      Permissions: "View only",
      state: "active",
      isSystem: true,
      permissionsMatrix: {},
      created_at: now(),
    },
  ],
  profiles: [
    {
      id: "u-admin",
      company_id: "co-1",
      email: "admin@fleet21.local",
      full_name: "Thabo Mokoena",
      role: "admin",
      role_id: "R001",
      phone: "+27 82 000 1100",
      employee_id: "APX-001",
      status: "active",
      photo_url: "https://randomuser.me/api/portraits/men/32.jpg",
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
      company_id: "co-1",
      driver_id: "u-driver",
      vehicle_id: "v-1",
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
      photo_url: "https://randomuser.me/api/portraits/women/65.jpg",
      created_at: now(),
    },
  ],
  documents: [
    {
      id: "d-1",
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

let supabase = null;
if (useSupabase) {
  supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false },
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

  async findUserByEmail(email) {
    if (!useSupabase) {
      return memory.profiles.find(
        (p) => p.email.toLowerCase() === String(email).toLowerCase(),
      );
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getUser(id) {
    if (!useSupabase) return memory.profiles.find((p) => p.id === id);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async registerCompany({ companyName, fullName, email, password, role }) {
    const hash = bcrypt.hashSync(password, 10);
    if (!useSupabase) {
      const company = {
        id: uuid(),
        name: companyName,
        code: companyName.slice(0, 3).toUpperCase(),
        created_at: now(),
      };
      const user = {
        id: uuid(),
        company_id: company.id,
        email,
        full_name: fullName,
        role: role || "admin",
        status: "active",
        password_hash: hash,
        created_at: now(),
      };
      memory.companies.push(company);
      memory.profiles.push(user);
      return { company, user: publicUser(user) };
    }
    const { data: company, error: cErr } = await supabase
      .from("companies")
      .insert({ name: companyName, code: companyName.slice(0, 3).toUpperCase() })
      .select()
      .single();
    if (cErr) throw cErr;
    const { data: user, error: uErr } = await supabase
      .from("profiles")
      .insert({
        company_id: company.id,
        email,
        full_name: fullName,
        role: role || "admin",
        password_hash: hash,
      })
      .select()
      .single();
    if (uErr) throw uErr;
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
    const map = {
      reviews: "vehicle_reviews",
    };
    const name = map[table] || table;
    const { data, error } = await supabase
      .from(name)
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insert(table, row) {
    const record = { id: uuid(), created_at: now(), ...row };
    if (!useSupabase) {
      memory[table].unshift(record);
      return record;
    }
    const map = { reviews: "vehicle_reviews" };
    const name = map[table] || table;
    const { data, error } = await supabase.from(name).insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async getById(table, id) {
    if (!useSupabase) return memory[table].find((r) => r.id === id) || null;
    const map = { reviews: "vehicle_reviews" };
    const name = map[table] || table;
    const { data, error } = await supabase.from(name).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async update(table, id, patch) {
    if (!useSupabase) {
      const idx = memory[table].findIndex((r) => r.id === id);
      if (idx < 0) return null;
      memory[table][idx] = { ...memory[table][idx], ...patch };
      return memory[table][idx];
    }
    const map = { reviews: "vehicle_reviews" };
    const name = map[table] || table;
    const { data, error } = await supabase
      .from(name)
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(table, id) {
    if (!useSupabase) {
      const before = memory[table].length;
      memory[table] = memory[table].filter((r) => r.id !== id);
      return before !== memory[table].length;
    }
    const map = { reviews: "vehicle_reviews" };
    const name = map[table] || table;
    const { error } = await supabase.from(name).delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  publicUser,
};
