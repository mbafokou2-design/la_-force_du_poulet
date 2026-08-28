import { pool } from "../config/db";
import { logger } from "../utils/logger";

export async function ensureFcmSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      id SERIAL PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      role VARCHAR(30) NOT NULL DEFAULT 'server',
      device_label VARCHAR(120),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    ALTER TABLE fcm_tokens ADD COLUMN IF NOT EXISTS device_id VARCHAR(64);
    CREATE INDEX IF NOT EXISTS idx_fcm_tokens_role ON fcm_tokens(role);
    CREATE INDEX IF NOT EXISTS idx_fcm_tokens_device_id ON fcm_tokens(device_id);
  `);
  logger.info("FCM", "fcm_tokens schema ready");
}
