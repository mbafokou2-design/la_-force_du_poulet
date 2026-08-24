import { Request, Response } from "express";
import {
  adminAuthConstants,
  getAdminCookieOptions,
  issueAdminSessionToken,
  isAdminAuthed,
} from "../middleware/admin-auth";

const ADMIN_ACCESS_CODE = adminAuthConstants.ADMIN_ACCESS_CODE;
const COOKIE_NAME = adminAuthConstants.COOKIE_NAME;

function clearCookie(res: Response) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; ${getAdminCookieOptions(0)}`);
}

export async function loginAdmin(req: Request, res: Response) {
  const code = String(req.body?.code ?? "").trim();
  if (!code) {
    return res.status(400).json({ error: "Code requis." });
  }

  if (code !== ADMIN_ACCESS_CODE) {
    return res.status(401).json({ error: "Code invalide." });
  }

  const token = issueAdminSessionToken();
  const cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; ${getAdminCookieOptions()}`;
  res.setHeader("Set-Cookie", cookie);
  return res.json({ authenticated: true });
}

export async function getAdminSession(req: Request, res: Response) {
  return res.json({ authenticated: isAdminAuthed(req) });
}

export async function logoutAdmin(req: Request, res: Response) {
  clearCookie(res);
  return res.json({ authenticated: false });
}
