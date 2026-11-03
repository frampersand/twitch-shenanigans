import { createHash, timingSafeEqual } from "crypto";
import { config } from "../config/index.js";

function digest(value) {
  return createHash("sha256").update(String(value)).digest();
}

/** Constant-time check against ADMIN_TOKEN; always false when no token is configured */
export function isValidAdminToken(token) {
  if (!config.adminToken || typeof token !== "string" || !token) return false;
  return timingSafeEqual(digest(token), digest(config.adminToken));
}

/** Express middleware: requires `Authorization: Bearer <ADMIN_TOKEN>` */
export function requireAdmin(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!isValidAdminToken(token)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}
