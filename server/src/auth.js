import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { db } from "./store.js";

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
    req.user = db.publicUser(user);
    next();
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: "Not allowed for this role" });
  }
  next();
};

export const verifyPassword = (plain, hash) => bcrypt.compareSync(plain, hash);
