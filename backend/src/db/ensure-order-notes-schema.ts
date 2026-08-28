import { pool } from "../config/db";
import { logger } from "../utils/logger";

export async function ensureOrderNotesSchema(): Promise<void> {
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_note TEXT;`);
  logger.info("ORDERS", "customer_note schema ready");
}