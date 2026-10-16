import bcrypt from "bcryptjs";
import { config, useSupabase } from "./config.js";
import { db } from "./store.js";
import { upsertAuthUser } from "./supabaseAuth.js";

const emailOf = () => String(config.platformAdminEmail || "admin@brightbyte.co.za").trim().toLowerCase();
const passwordOf = () => String(config.platformAdminPassword || "Salvation@21");

export const ensurePlatformAdmin = async () => {
  const email = emailOf();
  const password = passwordOf();
  if (!email || password.length < 6) return null;

  const authUser = useSupabase
    ? await upsertAuthUser({ email, password, fullName: "BrightByte Admin" })
    : null;

  let company =
    (await db.fetchAll("companies")).find(
      (row) => !row.demo && String(row.contact_email || "").toLowerCase() === email,
    ) || (await db.fetchAll("companies")).find((row) => !row.demo && String(row.name || "").toLowerCase() === "brightbyte");

  if (!company) {
    company = await db.insert("companies", {
      name: "BrightByte",
      code: "BB",
      city: "",
      address: "",
      contact_email: email,
      status: "active",
    });
  } else if (String(company.status || "").toLowerCase() !== "active") {
    company = await db.update("companies", company.id, { status: "active" });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const existing = await db.findUserByEmail(email);
  const fields = {
    company_id: company.id,
    email,
    full_name: existing?.full_name || "BrightByte Admin",
    role: "super_admin",
    role_id: "R000",
    status: "active",
    password_hash,
  };

  if (existing?.id) {
    return db.update("profiles", existing.id, fields);
  }

  return db.insert("profiles", {
    ...fields,
    ...(authUser?.id ? { id: authUser.id } : {}),
  });
};
