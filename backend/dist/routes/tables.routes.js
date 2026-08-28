"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tables_controller_1 = require("../controllers/tables.controller");
const router = (0, express_1.Router)();
router.post("/", tables_controller_1.createTable);
router.get("/", tables_controller_1.getTables);
router.get("/:id/qr-code", tables_controller_1.getTableQrCode);
router.delete("/:id", tables_controller_1.deleteTable);
exports.default = router;
//# sourceMappingURL=tables.routes.js.map