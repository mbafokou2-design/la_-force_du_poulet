"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./utils/logger");
const tables_routes_1 = __importDefault(require("./routes/tables.routes"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Log de chaque requête entrante — utile pour voir immédiatement ce qui arrive au serveur
app.use((req, res, next) => {
    logger_1.logger.info("app.ts", `${req.method} ${req.originalUrl}`);
    next();
});
// Fichiers statiques : QR codes générés + dashboard admin
app.use("/qrcodes", express_1.default.static(path_1.default.join(__dirname, "..", "public", "qrcodes")));
app.use("/admin", express_1.default.static(path_1.default.join(__dirname, "..", "public", "admin")));
// Servir l'application cliente (le menu) à la racine du serveur
app.use(express_1.default.static(path_1.default.join(__dirname, "..", "..", "frontend")));
// Routes API
app.use("/api/tables", tables_routes_1.default);
app.use("/api/orders", orders_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
// Route de vérification rapide que le serveur tourne
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// 404 — route inconnue
app.use((req, res) => {
    logger_1.logger.warn("app.ts", `Route inconnue appelée: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "Route introuvable." });
});
// Middleware d'erreur global — filet de sécurité final.
// Si une erreur non catchée arrive jusqu'ici, on la log en entier au lieu de la laisser silencieuse.
app.use((err, req, res, next) => {
    logger_1.logger.error("app.ts", `Erreur non gérée sur ${req.method} ${req.originalUrl}`, err);
    res.status(500).json({ error: "Erreur serveur inattendue.", detail: err.message });
});
exports.default = app;
//# sourceMappingURL=app.js.map