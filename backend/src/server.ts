import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { testConnection } from "./config/db";
import { logger } from "./utils/logger";

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
    await testConnection(); // plante ici avec un message clair si Neon est injoignable

    app.listen(PORT, () => {
      logger.info("server.ts", `✅ Serveur démarré sur http://localhost:${PORT}`);
      logger.info("server.ts", `📊 Dashboard admin: http://localhost:${PORT}/admin`);
    });
  } catch (err) {
    logger.error("server.ts", "❌ Échec du démarrage du serveur", err);
    process.exit(1);
  }
}

start();