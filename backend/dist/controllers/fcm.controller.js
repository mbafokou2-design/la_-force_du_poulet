"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFcmPublicConfig = getFcmPublicConfig;
exports.registerFcmToken = registerFcmToken;
const fcm_tokens_repository_1 = require("../repositories/fcm-tokens.repository");
const logger_1 = require("../utils/logger");
function getFcmPublicConfig(req, res) {
    const config = process.env.FIREBASE_WEB_CONFIG_JSON;
    const vapidKey = process.env.FIREBASE_WEB_PUSH_CERTIFICATE_KEY;
    if (!config || !vapidKey)
        return res.status(503).json({ error: "FCM Web n'est pas encore configure." });
    try {
        return res.json({ firebaseConfig: JSON.parse(config), vapidKey });
    }
    catch {
        return res.status(500).json({ error: "FIREBASE_WEB_CONFIG_JSON invalide." });
    }
}
async function registerFcmToken(req, res) {
    const token = String(req.body?.token || "").trim();
    const deviceLabel = String(req.body?.device_label || "").trim().slice(0, 120) || null;
    if (token.length < 20)
        return res.status(400).json({ error: "Token FCM invalide." });
    await (0, fcm_tokens_repository_1.upsertServerFcmToken)(token, deviceLabel);
    logger_1.logger.info("FCM", "Server device subscribed", { deviceLabel });
    return res.status(201).json({ registered: true });
}
//# sourceMappingURL=fcm.controller.js.map