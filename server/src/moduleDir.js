import path from "path";
import { fileURLToPath } from "url";

export const moduleDir = (metaUrl) => {
  if (typeof metaUrl === "string" && metaUrl) {
    return path.dirname(fileURLToPath(metaUrl));
  }
  return process.env.LAMBDA_TASK_ROOT || process.cwd();
};
