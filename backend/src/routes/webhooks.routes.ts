import { Router } from "express";
import { handleOrangeSmsDeliveryReceipt } from "../controllers/orange-webhook.controller";

const router = Router();

router.post("/orange/sms-dr", handleOrangeSmsDeliveryReceipt);

export default router;

