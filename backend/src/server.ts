import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { testConnection } from "./config/db";
import { getOrangeSmsDeliveryCallbackUrl } from "./config/orange";
import { ensureSmsSchema } from "./db/ensure-sms-schema";
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
      senderAddress: process.env.ORANGE_SENDER_ADDRESS || "",
    });
    await testConnection(); // plante ici avec un message clair si Neon est injoignable
    await ensureSmsSchema();

    app.listen(PORT, () => {
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
