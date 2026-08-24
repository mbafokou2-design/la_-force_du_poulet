import { Router } from "express";
import { getAdminSession, loginAdmin, logoutAdmin } from "../controllers/admin.controller";
import {
  addSmsRecipientController,
  getSmsRecipientsController,
  removeSmsRecipientController,
} from "../controllers/sms-recipients.controller";
import { requireAdminAuth } from "../middleware/admin-auth";

const router = Router();

router.post("/login", loginAdmin);
router.get("/session", getAdminSession);
router.post("/logout", logoutAdmin);
router.get("/sms-recipients", requireAdminAuth, getSmsRecipientsController);
router.post("/sms-recipients", requireAdminAuth, addSmsRecipientController);
router.delete("/sms-recipients/:phone", requireAdminAuth, removeSmsRecipientController);

export default router;
