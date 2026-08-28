"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const orange_1 = require("./config/orange");
const ensure_sms_schema_1 = require("./db/ensure-sms-schema");
const ensure_fcm_schema_1 = require("./db/ensure-fcm-schema");
const logger_1 = require("./utils/logger");
const orange_sms_service_1 = require("./services/orange-sms.service");
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
        (0, orange_sms_service_1.validateOrangeSmsConfig)({
            authorization: process.env.ORANGE_AUTHORIZATION || "",
            clientId: process.env.ORANGE_CLIENT_ID || "",
            clientSecret: process.env.ORANGE_CLIENT_SECRET || "",
            senderAddress: process.env.ORANGE_SMS_SENDER || "",
        });
        try {
            await (0, db_1.testConnection)();
            await (0, ensure_sms_schema_1.ensureSmsSchema)();
            await (0, ensure_fcm_schema_1.ensureFcmSchema)();
        }
        catch (dbErr) {
            logger_1.logger.warn("server.ts", "⚠️ Base Neon indisponible au démarrage; le serveur continue sans initialisation DB.");
            logger_1.logger.warn("server.ts", "Les routes dépendantes de la DB échoueront tant que Neon reste injoignable.", dbErr);
        }
        app_1.default.listen(PORT, () => {
            logger_1.logger.info("server.ts", `✅ Serveur démarré sur http://localhost:${PORT}`);
            logger_1.logger.info("server.ts", `📊 Dashboard admin: http://localhost:${PORT}/admin`);
            logger_1.logger.info("server.ts", `📩 Orange SMS DR callback: ${(0, orange_1.getOrangeSmsDeliveryCallbackUrl)()}`);
        });
    }
    catch (err) {
        logger_1.logger.error("server.ts", "❌ Échec du démarrage du serveur", err);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=server.js.map