import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type BatchResponse } from "firebase-admin/messaging";
import { deleteFcmTokens, getServerFcmTokens } from "../repositories/fcm-tokens.repository";
import { logger } from "../utils/logger";

const INVALID_TOKEN_CODES = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);

function getServiceAccount(): Record<string, string> | null {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return projectId && clientEmail && privateKey ? { project_id: projectId, client_email: clientEmail, private_key: privateKey } : null;
}

function messaging() {
  const account = getServiceAccount();
  if (!account) return null;
  if (getApps().length === 0) initializeApp({ credential: cert(account) });
  return getMessaging();
}

export type PushResult = { enabled: boolean; attempted: number; sent: number; failed: number };

export async function dispatchOrderPush(input: { orderId: number; tableNumber: string; message: string }): Promise<PushResult> {
  let fcm;
  try {
    fcm = messaging();
  } catch (error) {
    logger.error("FCM", "Firebase Admin configuration is invalid", error);
    return { enabled: false, attempted: 0, sent: 0, failed: 0 };
  }
  if (!fcm) return { enabled: false, attempted: 0, sent: 0, failed: 0 };

  const tokens = await getServerFcmTokens();
  const orderUrl = `/serveur/commandes/?id=${input.orderId}`;
  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  for (let start = 0; start < tokens.length; start += 500) {
    const batch = tokens.slice(start, start + 500);
    const response: BatchResponse = await fcm.sendEachForMulticast({
      tokens: batch,
      notification: { title: `Nouvelle commande - Table ${input.tableNumber}`, body: input.message },
      data: { orderId: String(input.orderId), tableNumber: input.tableNumber, url: orderUrl },
      webpush: {
        headers: { Urgency: "high", TTL: "300" },
        notification: { icon: "/assets/images/logo.webp", badge: "/assets/images/logo.webp", requireInteraction: true, vibrate: [300, 150, 300] },
        fcmOptions: { link: orderUrl },
      },
    });
    sent += response.successCount;
    failed += response.failureCount;
    response.responses.forEach((result, index) => {
      if (!result.success && result.error && INVALID_TOKEN_CODES.has(result.error.code)) invalidTokens.push(batch[index]);
    });
  }

  await deleteFcmTokens(invalidTokens);
  logger.info("FCM", `Order #${input.orderId}: ${sent}/${tokens.length} push notifications sent`, { invalidTokensRemoved: invalidTokens.length });
  return { enabled: true, attempted: tokens.length, sent, failed };
}
