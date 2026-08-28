"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const sms_recipients_controller_1 = require("../controllers/sms-recipients.controller");
const admin_auth_1 = require("../middleware/admin-auth");
const router = (0, express_1.Router)();
router.post("/login", admin_controller_1.loginAdmin);
router.get("/session", admin_controller_1.getAdminSession);
router.post("/logout", admin_controller_1.logoutAdmin);
router.get("/sms-recipients", admin_auth_1.requireAdminAuth, sms_recipients_controller_1.getSmsRecipientsController);
router.post("/sms-recipients", admin_auth_1.requireAdminAuth, sms_recipients_controller_1.addSmsRecipientController);
router.delete("/sms-recipients/:phone", admin_auth_1.requireAdminAuth, sms_recipients_controller_1.removeSmsRecipientController);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map