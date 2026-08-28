"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./utils/logger");
const sms_1 = require("./utils/sms");
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const tables_routes_1 = __importDefault(require("./routes/tables.routes"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const sms_routes_1 = __importDefault(require("./routes/sms.routes"));
const webhooks_routes_1 = __importDefault(require("./routes/webhooks.routes"));
const fcm_routes_1 = __importDefault(require("./routes/fcm.routes"));
const admin_auth_1 = require("./middleware/admin-auth");
const app = (0, express_1.default)();
function firstExistingPath(candidates) {
    for (const candidate of candidates) {
        if (fs_1.default.existsSync(candidate))
            return candidate;
    }
    return null;
}
function getFrontendRoot() {
    return firstExistingPath([
        path_1.default.join(__dirname, "..", "public", "site"),
        path_1.default.join(__dirname, "..", "..", "frontend"),
    ]);
}
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "1mb" }));
app.use((req, res, next) => {
    const shouldLog = req.originalUrl.startsWith("/api/") || req.originalUrl.startsWith("/orange");
    if (shouldLog) {
        logger_1.logger.info("HTTP", `${req.method} ${req.originalUrl}`);
    }
    next();
});
app.use("/qrcodes", express_1.default.static(path_1.default.join(__dirname, "..", "public", "qrcodes")));
app.use("/admin", express_1.default.static(path_1.default.join(__dirname, "..", "public", "admin")));
app.use("/serveur", express_1.default.static(path_1.default.join(__dirname, "..", "public", "serveur")));
app.get("/firebase-messaging-sw.js", (req, res) => res.sendFile(path_1.default.join(__dirname, "..", "public", "firebase-messaging-sw.js")));
const frontendRoot = getFrontendRoot();
if (frontendRoot) {
    app.use("/assets", express_1.default.static(path_1.default.join(frontendRoot, "assets")));
    app.use(express_1.default.static(frontendRoot));
}
else {
    logger_1.logger.warn("HTTP", "Frontend static root introuvable; le menu client ne sera pas servi.");
}
app.use("/api/admin", admin_routes_1.default);
app.use("/api/webhooks", webhooks_routes_1.default);
app.use("/api/fcm", fcm_routes_1.default);
app.use("/api/orders", orders_routes_1.default);
app.use("/api/tables", admin_auth_1.requireAdminAuth, tables_routes_1.default);
app.use("/api/dashboard", admin_auth_1.requireAdminAuth, dashboard_routes_1.default);
app.use("/api/dashboard/sms", admin_auth_1.requireAdminAuth, sms_routes_1.default);
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.use((req, res) => {
    if (!(0, sms_1.isStaticAssetPath)(req.originalUrl)) {
        logger_1.logger.warn("HTTP", `Route inconnue: ${req.method} ${req.originalUrl}`);
    }
    res.status(404).json({ error: "Route introuvable." });
});
app.use((err, req, res, next) => {
    logger_1.logger.error("HTTP", `Unhandled error on ${req.method} ${req.originalUrl}`, err);
    res.status(500).json({ error: "Erreur serveur inattendue.", detail: err.message });
});
exports.default = app;
//# sourceMappingURL=app.js.map