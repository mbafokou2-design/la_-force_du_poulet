import { Router } from "express";
import { getAdminSession, loginAdmin, logoutAdmin } from "../controllers/admin.controller";

const router = Router();

router.post("/login", loginAdmin);
router.get("/session", getAdminSession);
router.post("/logout", logoutAdmin);

export default router;

