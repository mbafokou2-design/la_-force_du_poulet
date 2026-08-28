import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { parseCookies } from "./admin-auth";

const ACCESS_CODE = process.env.SERVER_ACCESS_CODE || process.env.ADMIN_ACCESS_CODE || "2032";
const SECRET = process.env.SERVER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || "change-me-in-production";
const TTL_MS = Number(process.env.SERVER_SESSION_TTL_MS || 30 * 24 * 60 * 60 * 1000);
const COOKIE_NAME = "lfp_server_session";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function issueToken(now = Date.now()): string {
  const issuedAt = String(now);
  const signature = crypto.createHmac("sha256", SECRET).update(`${ACCESS_CODE}:${issuedAt}`).digest("hex");
  return `${issuedAt}.${signature}`;
}

function validToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [issuedAtRaw, signature] = token.split(".");
  const issuedAt = Number(issuedAtRaw);
  if (!signature || !Number.isFinite(issuedAt) || now - issuedAt > TTL_MS || issuedAt > now + 60_000) return false;
  return safeEqual(signature, issueToken(issuedAt).split(".")[1]);
}

function cookie(maxAgeMs: number): string {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function loginServer(req: Request, res: Response) {
  const code = String(req.body?.code || "");
  if (!safeEqual(code, ACCESS_CODE)) return res.status(401).json({ error: "Code serveur invalide." });
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${encodeURIComponent(issueToken())}; ${cookie(TTL_MS)}`);
  return res.json({ authenticated: true });
}

export function getServerSession(req: Request, res: Response) {
  return res.json({ authenticated: validToken(parseCookies(req.headers.cookie)[COOKIE_NAME]) });
}

export function requireServerAuth(req: Request, res: Response, next: NextFunction) {
  if (validToken(parseCookies(req.headers.cookie)[COOKIE_NAME])) return next();
  return res.status(401).json({ error: "Authentification serveur requise." });
}
