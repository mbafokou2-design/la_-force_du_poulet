import express from "express";
import cors from "cors";
import path from "path";
import { logger } from "./utils/logger";

import tablesRoutes from "./routes/tables.routes";
import ordersRoutes from "./routes/orders.routes";
import dashboardRoutes from "./routes/dashboard.routes";

const app = express();

app.use(cors());
app.use(express.json());

// Log de chaque requête entrante — utile pour voir immédiatement ce qui arrive au serveur
app.use((req, res, next) => {
  logger.info("app.ts", `${req.method} ${req.originalUrl}`);
  next();
});

// Fichiers statiques : QR codes générés + dashboard admin
app.use("/qrcodes", express.static(path.join(__dirname, "..", "public", "qrcodes")));
app.use("/admin", express.static(path.join(__dirname, "..", "public", "admin")));

// Servir l'application cliente (le menu) à la racine du serveur
app.use(express.static(path.join(__dirname, "..", "..", "frontend")));

// Routes API
app.use("/api/tables", tablesRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Route de vérification rapide que le serveur tourne
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 — route inconnue
app.use((req, res) => {
  logger.warn("app.ts", `Route inconnue appelée: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route introuvable." });
});

// Middleware d'erreur global — filet de sécurité final.
// Si une erreur non catchée arrive jusqu'ici, on la log en entier au lieu de la laisser silencieuse.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error("app.ts", `Erreur non gérée sur ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: "Erreur serveur inattendue.", detail: err.message });
});

export default app;