import express from "express";
import cors from "cors";
import path from "path";
import { logger } from "./utils/logger";
import { isStaticAssetPath } from "./utils/sms";

import adminRoutes from "./routes/admin.routes";
import tablesRoutes from "./routes/tables.routes";
import ordersRoutes from "./routes/orders.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import smsRoutes from "./routes/sms.routes";
import webhooksRoutes from "./routes/webhooks.routes";
import { requireAdminAuth } from "./middleware/admin-auth";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const shouldLog = req.originalUrl.startsWith("/api/") || req.originalUrl.startsWith("/orange");
  if (shouldLog) {
    logger.info("HTTP", `${req.method} ${req.originalUrl}`);
  }
  next();
});

app.use("/qrcodes", express.static(path.join(__dirname, "..", "public", "qrcodes")));
app.use("/admin", express.static(path.join(__dirname, "..", "public", "admin")));
app.use("/assets", express.static(path.join(__dirname, "..", "..", "frontend", "assets")));
app.use(express.static(path.join(__dirname, "..", "..", "frontend")));

app.use("/api/admin", adminRoutes);
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/tables", requireAdminAuth, tablesRoutes);
app.use("/api/dashboard", requireAdminAuth, dashboardRoutes);
app.use("/api/dashboard/sms", requireAdminAuth, smsRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  if (!isStaticAssetPath(req.originalUrl)) {
    logger.warn("HTTP", `Route inconnue: ${req.method} ${req.originalUrl}`);
  }
  res.status(404).json({ error: "Route introuvable." });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error("HTTP", `Unhandled error on ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: "Erreur serveur inattendue.", detail: err.message });
});

export default app;
