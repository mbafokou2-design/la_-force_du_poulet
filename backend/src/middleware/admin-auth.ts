import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";

const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || "2032";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "lfp-admin-session-secret";
const ADMIN_SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS || 8 * 60 * 60 * 1000);
const COOKIE_NAME = "lfp_admin_session";

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, chunk) => {
    const [key, ...rest] = chunk.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("=") || "");
    return acc;
  }, {});
}

export function issueAdminSessionToken(now = Date.now()): string {
  const issuedAt = String(now);
  const signature = crypto.createHmac("sha256", ADMIN_SESSION_SECRET).update(`${ADMIN_ACCESS_CODE}:${issuedAt}`).digest("hex");
  return `${issuedAt}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [issuedAtRaw, signature] = token.split(".");
  if (!issuedAtRaw || !signature) return false;

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt) || now - issuedAt > ADMIN_SESSION_TTL_MS || issuedAt > now + 60_000) {
    return false;
  }

  const expected = issueAdminSessionToken(issuedAt).split(".")[1];
  return timingSafeEqualString(signature, expected);
}

export function getAdminCookieOptions(maxAgeMs = ADMIN_SESSION_TTL_MS) {
  const secure = process.env.NODE_ENV === "production";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}${secure ? "; Secure" : ""}`;
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const cookies = parseCookies(req.headers.cookie);
  if (verifyAdminSessionToken(cookies[COOKIE_NAME])) {
    return next();
  }

  return res.status(401).json({ error: "Authentication required." });
}

export function isAdminAuthed(req: Request): boolean {
  const cookies = parseCookies(req.headers.cookie);
  return verifyAdminSessionToken(cookies[COOKIE_NAME]);
}

export const adminAuthConstants = {
  ADMIN_ACCESS_CODE,
  COOKIE_NAME,
};

