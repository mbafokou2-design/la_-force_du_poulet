import type { Request, Response } from "express";
import { upsertServerFcmToken } from "../repositories/fcm-tokens.repository";
import { logger } from "../utils/logger";

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
  await upsertServerFcmToken(token, deviceLabel);
  logger.info("FCM", "Server device subscribed", { deviceLabel });
  return res.status(201).json({ registered: true });
}
