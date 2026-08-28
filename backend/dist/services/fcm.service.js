"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchOrderPush = dispatchOrderPush;
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
const fcm_tokens_repository_1 = require("../repositories/fcm-tokens.repository");
const logger_1 = require("../utils/logger");
const INVALID_TOKEN_CODES = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);
function getServiceAccount() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    return projectId && clientEmail && privateKey ? { project_id: projectId, client_email: clientEmail, private_key: privateKey } : null;
}
function messaging() {
    const account = getServiceAccount();
    if (!account)
        return null;
    if ((0, app_1.getApps)().length === 0)
        (0, app_1.initializeApp)({ credential: (0, app_1.cert)(account) });
    return (0, messaging_1.getMessaging)();
}
async function dispatchOrderPush(input) {
    let fcm;
    try {
        fcm = messaging();
    }
    catch (error) {
        logger_1.logger.error("FCM", "Firebase Admin configuration is invalid", error);
        return { enabled: false, attempted: 0, sent: 0, failed: 0 };
    }
    if (!fcm)
        return { enabled: false, attempted: 0, sent: 0, failed: 0 };
    const tokens = await (0, fcm_tokens_repository_1.getServerFcmTokens)();
    let sent = 0;
    let failed = 0;
    const invalidTokens = [];
    for (let start = 0; start < tokens.length; start += 500) {
        const batch = tokens.slice(start, start + 500);
        const response = await fcm.sendEachForMulticast({
            tokens: batch,
            notification: { title: `Nouvelle commande - Table ${input.tableNumber}`, body: input.message },
            data: { orderId: String(input.orderId), tableNumber: input.tableNumber, url: "/serveur/" },
            webpush: {
                headers: { Urgency: "high", TTL: "300" },
                notification: { icon: "/assets/images/logo.webp", badge: "/assets/images/logo.webp", requireInteraction: true, vibrate: [300, 150, 300] },
                fcmOptions: { link: "/serveur/" },
            },
        });
        sent += response.successCount;
        failed += response.failureCount;
        response.responses.forEach((result, index) => {
            if (!result.success && result.error && INVALID_TOKEN_CODES.has(result.error.code))
                invalidTokens.push(batch[index]);
        });
    }
    await (0, fcm_tokens_repository_1.deleteFcmTokens)(invalidTokens);
    logger_1.logger.info("FCM", `Order #${input.orderId}: ${sent}/${tokens.length} push notifications sent`, { invalidTokensRemoved: invalidTokens.length });
    return { enabled: true, attempted: tokens.length, sent, failed };
}
//# sourceMappingURL=fcm.service.js.map