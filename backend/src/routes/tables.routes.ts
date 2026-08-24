import { Router } from "express";
import { createTable, getTableQrCode, getTables, deleteTable } from "../controllers/tables.controller";

const router = Router();

router.post("/", createTable);
router.get("/", getTables);
router.get("/:id/qr-code", getTableQrCode);
router.delete("/:id", deleteTable);

export default router;
