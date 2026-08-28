import { Router } from "express";
import { getFcmAdminStatus, getFcmPublicConfig, getServerOrderDetail, getServerOrders, registerFcmToken, unregisterFcmToken } from "../controllers/fcm.controller";
import { getServerSession, loginServer, requireServerAuth } from "../middleware/server-auth";
import { requireAdminAuth } from "../middleware/admin-auth";

const router = Router();
router.get("/public-config", getFcmPublicConfig);
router.get("/admin-status", requireAdminAuth, getFcmAdminStatus);
router.post("/server/login", loginServer);
router.get("/server/orders", requireServerAuth, getServerOrders);
router.get("/server/orders/:id", requireServerAuth, getServerOrderDetail);
router.get("/server/session", getServerSession);
router.post("/tokens", requireServerAuth, registerFcmToken);
router.delete("/tokens", requireServerAuth, unregisterFcmToken);

export default router;
