import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { testConnection } from "./config/db";
import { getOrangeSmsDeliveryCallbackUrl } from "./config/orange";
import { getConfiguredPublicBaseUrl } from "./utils/public-url";
import { ensureSmsSchema } from "./db/ensure-sms-schema";
import { ensureFcmSchema } from "./db/ensure-fcm-schema";
import { logger } from "./utils/logger";
import { validateOrangeSmsConfig } from "./services/orange-sms.service";

const PORT = process.env.PORT || 4000;

// Capture les erreurs qui, sinon, feraient planter le process sans aucun log clair
process.on("uncaughtException", (err) => {
  logger.error("server.ts", "❌ uncaughtException — le serveur va s'arrêter", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("server.ts", "❌ unhandledRejection (promesse non catchée)", reason);
});

async function start() {
  try {
    validateOrangeSmsConfig({
      authorization: process.env.ORANGE_AUTHORIZATION || "",
      clientId: process.env.ORANGE_CLIENT_ID || "",
      clientSecret: process.env.ORANGE_CLIENT_SECRET || "",
      senderAddress: process.env.ORANGE_SMS_SENDER || "",
    });

    try {
      await testConnection();
      await ensureSmsSchema();
      await ensureFcmSchema();
    } catch (dbErr) {
      logger.warn("server.ts", "⚠️ Base Neon indisponible au démarrage; le serveur continue sans initialisation DB.");
      logger.warn("server.ts", "Les routes dépendantes de la DB échoueront tant que Neon reste injoignable.", dbErr);
    }

    app.listen(PORT, () => {
      const publicUrl = getConfiguredPublicBaseUrl();
      const fcmWebReady = Boolean(process.env.FIREBASE_WEB_CONFIG_JSON && process.env.FIREBASE_WEB_PUSH_CERTIFICATE_KEY);
      const fcmAdminReady = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY));
      logger.info("STARTUP", `Public URL: ${publicUrl}`);
      logger.info("STARTUP", `Admin: ${publicUrl}/admin/`);
      logger.info("STARTUP", `Server alerts: ${publicUrl}/serveur/`);
      logger.info("STARTUP", `Health: ${publicUrl}/api/health`);
      logger.info("STARTUP", `SMS Orange: ${process.env.SMS_ENABLED === "true" ? "ENABLED" : "DISABLED - no Orange request will be sent"}`);
      logger.info("STARTUP", `FCM web config: ${fcmWebReady ? "READY" : "MISSING"}`);
      logger.info("STARTUP", `FCM Admin credentials: ${fcmAdminReady ? "READY" : "MISSING"}`);
      logger.info("server.ts", `✅ Serveur démarré sur http://localhost:${PORT}`);
      logger.info("server.ts", `📊 Dashboard admin: http://localhost:${PORT}/admin`);
      logger.info("server.ts", `📩 Orange SMS DR callback: ${getOrangeSmsDeliveryCallbackUrl()}`);
    });
  } catch (err) {
    logger.error("server.ts", "❌ Échec du démarrage du serveur", err);
    process.exit(1);
  }
}

start();
