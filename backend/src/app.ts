import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { logger } from "./utils/logger";
import { isStaticAssetPath } from "./utils/sms";

import adminRoutes from "./routes/admin.routes";
import tablesRoutes from "./routes/tables.routes";
import ordersRoutes from "./routes/orders.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import smsRoutes from "./routes/sms.routes";
import webhooksRoutes from "./routes/webhooks.routes";
import fcmRoutes from "./routes/fcm.routes";
import { requireAdminAuth } from "./middleware/admin-auth";

const app = express();

function firstExistingPath(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function getFrontendRoot(): string | null {
  return firstExistingPath([
    path.join(__dirname, "..", "public", "site"),
    path.join(__dirname, "..", "..", "frontend"),
  ]);
}

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
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "admin", "index.html")));
app.get("/serveur", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "serveur", "index.html")));
app.use("/admin", express.static(path.join(__dirname, "..", "public", "admin")));
app.use("/serveur", express.static(path.join(__dirname, "..", "public", "serveur")));
app.get("/firebase-messaging-sw.js", (req, res) => {
  const config = process.env.FIREBASE_WEB_CONFIG_JSON;
  if (!config) return res.status(503).type("application/javascript").send("throw new Error('FCM Web is not configured');");
  const worker = fs.readFileSync(path.join(__dirname, "..", "public", "firebase-messaging-sw.js"), "utf8");
  return res.type("application/javascript").send(worker.replace("__FIREBASE_CONFIG__", config));
});

const frontendRoot = getFrontendRoot();
if (frontendRoot) {
  app.use("/assets", express.static(path.join(frontendRoot, "assets")));
  app.use(express.static(frontendRoot));
} else {
  logger.warn("HTTP", "Frontend static root introuvable; le menu client ne sera pas servi.");
}

app.use("/api/admin", adminRoutes);
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/fcm", fcmRoutes);
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
