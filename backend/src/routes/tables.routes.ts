import { Router } from "express";
import { createTable, getTables, deleteTable } from "../controllers/tables.controller";

const router = Router();

router.post("/", createTable);
router.get("/", getTables);
router.delete("/:id", deleteTable);

export default router;