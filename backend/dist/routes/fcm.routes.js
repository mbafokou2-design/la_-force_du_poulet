"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fcm_controller_1 = require("../controllers/fcm.controller");
const server_auth_1 = require("../middleware/server-auth");
const router = (0, express_1.Router)();
router.get("/public-config", fcm_controller_1.getFcmPublicConfig);
router.post("/server/login", server_auth_1.loginServer);
router.get("/server/session", server_auth_1.getServerSession);
router.post("/tokens", server_auth_1.requireServerAuth, fcm_controller_1.registerFcmToken);
exports.default = router;
//# sourceMappingURL=fcm.routes.js.map