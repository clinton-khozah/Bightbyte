import fs from "fs";
import path from "path";
import { config, useSupabase } from "./config.js";
import { moduleDir } from "./moduleDir.js";
import { db } from "./store.js";

const __dirname = moduleDir(import.meta.url);
const onLambda = Boolean(process.env.LAMBDA_TASK_ROOT || process.env.NETLIFY);
const localDir = onLambda ? path.join("/tmp", "fleet21-uploads") : path.join(__dirname, "..", "uploads");
fs.mkdirSync(localDir, { recursive: true });

let bucketReady = false;

const extOf = (file) => {
  const ext = path.extname(String(file.originalname || "")).slice(0, 8);
  const safe = ext.replace(/[^\w.]/g, "");
  return safe || ".jpg";
};

const ensureBucket = async (bucket) => {
  if (bucketReady) return;
  const { data, error } = await db.supabase.storage.listBuckets();
  if (!error && !data?.some((row) => row.name === bucket)) {
    const created = await db.supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: "52428800",
    });
    if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
  }
  bucketReady = true;
};

export const uploadDir = localDir;

export const persistUploads = async (files) => {
  const list = Array.isArray(files) ? files : [];
  if (!list.length) return [];
  if (useSupabase && db.supabase) {
    const bucket = config.storageBucket || "fleet21";
    await ensureBucket(bucket);
    const urls = [];
    for (const file of list) {
      const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extOf(file)}`;
      const { error } = await db.supabase.storage.from(bucket).upload(key, file.buffer, {
        contentType: file.mimetype || "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      const { data } = db.supabase.storage.from(bucket).getPublicUrl(key);
      urls.push(data.publicUrl);
    }
    return urls;
  }
  return list.map((file) => {
    const name = `${Date.now()}-${String(file.originalname || "file").replace(/[^\w.-]/g, "_")}`;
    fs.writeFileSync(path.join(localDir, name), file.buffer);
    return `/uploads/${name}`;
  });
};
