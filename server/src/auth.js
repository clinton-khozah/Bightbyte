import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { db } from "./store.js";
import { hasPermission, resolvePermissions } from "./permissions.js";

export const signToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
    },
    config.jwtSecret,
    { expiresIn: "7d" },
  );

export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Sign in required" });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await db.getUser(payload.sub);
    if (!user) return res.status(401).json({ error: "Account not found" });
    const pub = db.publicUser(user);
    const extra = await resolvePermissions(pub, db);
    req.user = { ...pub, ...extra };
    next();
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  const role = req.user?.role;
  const key = req.user?.role_key;
  if (role === "super_admin") return next();
  if (!roles.includes(role) && !roles.includes(key)) {
    return res.status(403).json({ error: "Not allowed for this role" });
  }
  next();
};

export const requirePermission = (module, action = "view") => (req, res, next) => {
  if (hasPermission(req.user, module, action)) return next();
  return res.status(403).json({ error: "Not allowed for this role" });
};

export const normalizeEmail = (value) => {
  let email = String(value || "").trim().toLowerCase();
  const angled = email.match(/<([^>]+@[^>]+)>/);
  if (angled) email = angled[1].trim().toLowerCase();
  email = email.replace(/^mailto:/i, "").replace(/\s+/g, "");
  return email;
};

export const verifyPassword = (plain, hash) => {
  if (!plain || typeof hash !== "string" || hash.length < 20) return false;
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
};
