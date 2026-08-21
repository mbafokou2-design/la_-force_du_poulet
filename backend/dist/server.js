"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const logger_1 = require("./utils/logger");
const PORT = process.env.PORT || 4000;
// Capture les erreurs qui, sinon, feraient planter le process sans aucun log clair
process.on("uncaughtException", (err) => {
    logger_1.logger.error("server.ts", "❌ uncaughtException — le serveur va s'arrêter", err);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    logger_1.logger.error("server.ts", "❌ unhandledRejection (promesse non catchée)", reason);
});
async function start() {
    try {
        await (0, db_1.testConnection)(); // plante ici avec un message clair si Neon est injoignable
        app_1.default.listen(PORT, () => {
            logger_1.logger.info("server.ts", `✅ Serveur démarré sur http://localhost:${PORT}`);
            logger_1.logger.info("server.ts", `📊 Dashboard admin: http://localhost:${PORT}/admin`);
        });
    }
    catch (err) {
        logger_1.logger.error("server.ts", "❌ Échec du démarrage du serveur", err);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=server.js.map