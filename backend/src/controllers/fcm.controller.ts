import type { Request, Response } from "express";
import crypto from "crypto";
import { pool } from "../config/db";
import { deleteFcmTokens, getServerFcmTokenCount, upsertServerFcmToken } from "../repositories/fcm-tokens.repository";
import { logger } from "../utils/logger";
import { parseCookies } from "../middleware/admin-auth";

const DEVICE_COOKIE = "lfp_fcm_device";
const DEVICE_COOKIE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

function getDeviceId(req: Request, res: Response): string {
  const current = String(parseCookies(req.headers.cookie)[DEVICE_COOKIE] || "");
  if (/^[a-f0-9-]{36}$/i.test(current)) return current;
  const deviceId = crypto.randomUUID();
  res.cookie(DEVICE_COOKIE, deviceId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: DEVICE_COOKIE_MAX_AGE_MS, path: "/" });
  return deviceId;
}
export function getFcmPublicConfig(req: Request, res: Response) {
  const config = process.env.FIREBASE_WEB_CONFIG_JSON;
  const vapidKey = process.env.FIREBASE_WEB_PUSH_CERTIFICATE_KEY;
  if (!config || !vapidKey) return res.status(503).json({ error: "FCM Web n'est pas encore configure." });
  try {
    return res.json({ firebaseConfig: JSON.parse(config), vapidKey });
  } catch {
    return res.status(500).json({ error: "FIREBASE_WEB_CONFIG_JSON invalide." });
  }
}

export async function registerFcmToken(req: Request, res: Response) {
  const token = String(req.body?.token || "").trim();
  const deviceLabel = String(req.body?.device_label || "").trim().slice(0, 120) || null;
  if (token.length < 20) return res.status(400).json({ error: "Token FCM invalide." });
  const deviceId = getDeviceId(req, res);
  await upsertServerFcmToken(token, deviceLabel, deviceId);
  logger.info("FCM", "Server device subscribed", { deviceLabel });
  return res.status(201).json({ registered: true });
}

export async function getFcmAdminStatus(req: Request, res: Response) {
  const registeredDevices = await getServerFcmTokenCount();
  return res.json({ configured: Boolean(process.env.FIREBASE_WEB_CONFIG_JSON && process.env.FIREBASE_WEB_PUSH_CERTIFICATE_KEY && process.env.FIREBASE_SERVICE_ACCOUNT_JSON), registered_devices: registeredDevices });
}

export async function unregisterFcmToken(req: Request, res: Response) {
  const token = String(req.body?.token || "").trim();
  if (token) await deleteFcmTokens([token]);
  return res.json({ unregistered: true });
}

export async function getServerOrders(req: Request, res: Response) {
  const result = await pool.query(`SELECT id, table_number, total_amount, created_at FROM orders ORDER BY created_at DESC LIMIT 50`);
  return res.json({ items: result.rows });
}

export async function getServerOrderDetail(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Commande invalide." });
  const order = await pool.query(`SELECT id, table_number, total_amount, customer_note, created_at FROM orders WHERE id = $1`, [id]);
  if (!order.rows[0]) return res.status(404).json({ error: "Commande introuvable." });
  const items = await pool.query(`SELECT product_name, unit_price, quantity, subtotal FROM order_items WHERE order_id = $1 ORDER BY id`, [id]);
  return res.json({ ...order.rows[0], items: items.rows });
}
