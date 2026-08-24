import { Router } from "express";
import {
  getSmsNotificationController,
  getSmsStatsController,
  listSmsNotificationsController,
} from "../controllers/sms.controller";

const router = Router();

router.get("/stats", getSmsStatsController);
router.get("/", listSmsNotificationsController);
router.get("/:id", getSmsNotificationController);

export default router;

