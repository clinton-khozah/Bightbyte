const TOKEN_KEY = "fleet21_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function api(path, options = {}, attempt = 0) {
  const method = String(options.method || "GET").toUpperCase();
  const canRetry = method === "GET" && attempt < 3;
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  let res;
  try {
    res = await fetch(path, { ...options, headers });
  } catch {
    if (canRetry) {
      await wait(400 * (attempt + 1));
      return api(path, options, attempt + 1);
    }
    throw new Error("Cannot reach the API. Start the server and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (canRetry && res.status >= 500) {
      await wait(400 * (attempt + 1));
      return api(path, options, attempt + 1);
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const uploadFiles = async (files) => {
  const body = new FormData();
  [...files].forEach((file) => body.append("files", file));
  return api("/api/uploads", { method: "POST", body });
};
