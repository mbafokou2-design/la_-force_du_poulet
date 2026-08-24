"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const router = (0, express_1.Router)();
router.post("/login", admin_controller_1.loginAdmin);
router.get("/session", admin_controller_1.getAdminSession);
router.post("/logout", admin_controller_1.logoutAdmin);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map