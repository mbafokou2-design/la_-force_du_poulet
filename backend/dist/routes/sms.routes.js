"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sms_controller_1 = require("../controllers/sms.controller");
const router = (0, express_1.Router)();
router.get("/stats", sms_controller_1.getSmsStatsController);
router.get("/", sms_controller_1.listSmsNotificationsController);
router.get("/:id", sms_controller_1.getSmsNotificationController);
exports.default = router;
//# sourceMappingURL=sms.routes.js.map