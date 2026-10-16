import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const clientOrigins = String(process.env.CLIENT_ORIGIN || "http://localhost:5173,https://brightbyte.co.za")
  .split(",")
  .map((row) => row.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT || 5050),
  clientOrigin: clientOrigins.length === 1 ? clientOrigins[0] : clientOrigins,
  jwtSecret: process.env.JWT_SECRET || "fleet21-dev-secret",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET || "fleet21",
  superAdminNotifyEmail: process.env.SUPER_ADMIN_NOTIFY_EMAIL || "",
  appLoginUrl: process.env.APP_LOGIN_URL || "https://brightbyte.co.za/login",
  emailjs: {
    serviceId: process.env.EMAILJS_SERVICE_ID || "",
    templateId: process.env.EMAILJS_TEMPLATE_ID || "template_nr0z4if",
    publicKey: process.env.EMAILJS_PUBLIC_KEY || "",
    privateKey: process.env.EMAILJS_PRIVATE_KEY || "",
  },
};

export const useSupabase = Boolean(
  config.supabaseUrl && config.supabaseServiceKey,
);
