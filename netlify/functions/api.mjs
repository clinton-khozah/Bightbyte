import serverless from "serverless-http";
import { app } from "../../server/src/index.js";

const handle = serverless(app);

const functionPrefix = "/.netlify/functions/api";

export const handler = async (event, context) => {
  let path = event.path || "/";
  if (path.startsWith(functionPrefix)) {
    path = path.slice(functionPrefix.length) || "/";
  }
  if (!path.startsWith("/api") && !path.startsWith("/uploads")) {
    path = `/api${path.startsWith("/") ? path : `/${path}`}`;
  }
  event.path = path;
  return handle(event, context);
};
