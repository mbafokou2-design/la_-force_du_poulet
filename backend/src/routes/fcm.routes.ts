import { Router } from "express";
import { getFcmPublicConfig, registerFcmToken } from "../controllers/fcm.controller";
import { getServerSession, loginServer, requireServerAuth } from "../middleware/server-auth";

const router = Router();
router.get("/public-config", getFcmPublicConfig);
router.post("/server/login", loginServer);
router.get("/server/session", getServerSession);
router.post("/tokens", requireServerAuth, registerFcmToken);

export default router;
