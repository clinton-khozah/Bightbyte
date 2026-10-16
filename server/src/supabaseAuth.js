import { createClient } from "@supabase/supabase-js";
import { config, useSupabase } from "./config.js";

const authHeaders = () => ({
  Authorization: `Bearer ${config.supabaseServiceKey}`,
  apikey: config.supabaseServiceKey,
  "Content-Type": "application/json",
});

const authFetch = async (path, options = {}) => {
  const res = await fetch(`${config.supabaseUrl}/auth/v1${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text };
  }
  if (!res.ok) {
    const error = new Error(body.msg || body.message || body.error_description || `Auth ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return body;
};

export const findAuthUserByEmail = async (email) => {
  const needle = String(email || "").trim().toLowerCase();
  if (!needle) return null;
  try {
    const byEmail = await authFetch(`/admin/users?email=${encodeURIComponent(needle)}`);
    const listed = byEmail.users || (byEmail.user ? [byEmail.user] : Array.isArray(byEmail) ? byEmail : []);
    const hit = listed.find((row) => String(row.email || "").toLowerCase() === needle);
    if (hit) return hit;
  } catch {
    /* older GoTrue builds ignore the email query */
  }
  const page = await authFetch("/admin/users?page=1&per_page=200");
  return (page.users || []).find((row) => String(row.email || "").toLowerCase() === needle) || null;
};

export const upsertAuthUser = async ({ email, password, fullName, userId }) => {
  if (!useSupabase) return null;
  const existing = await findAuthUserByEmail(email);
  if (existing?.id) {
    await authFetch(`/admin/users/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify({
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || "" },
      }),
    });
    return existing;
  }
  const payload = {
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || "" },
  };
  try {
    const created = await authFetch("/admin/users", {
      method: "POST",
      body: JSON.stringify(userId ? { ...payload, id: userId } : payload),
    });
    return created.user || created;
  } catch (error) {
    if (!userId) throw error;
    const created = await authFetch("/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return created.user || created;
  }
};

export const deleteAuthUser = async (userId) => {
  if (!useSupabase || !userId) return;
  await authFetch(`/admin/users/${userId}`, { method: "DELETE" });
};

export const signInAuth = async (email, password) => {
  if (!useSupabase) return { ok: false };
  const key = config.supabaseAnonKey || config.supabaseServiceKey;
  const client = createClient(config.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data.user };
};
