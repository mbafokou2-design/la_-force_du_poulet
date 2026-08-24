"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orange_webhook_controller_1 = require("../controllers/orange-webhook.controller");
const router = (0, express_1.Router)();
router.post("/orange/sms-dr", orange_webhook_controller_1.handleOrangeSmsDeliveryReceipt);
exports.default = router;
//# sourceMappingURL=webhooks.routes.js.map