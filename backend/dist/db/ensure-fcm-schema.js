"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureFcmSchema = ensureFcmSchema;
const db_1 = require("../config/db");
const logger_1 = require("../utils/logger");
async function ensureFcmSchema() {
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      id SERIAL PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      role VARCHAR(30) NOT NULL DEFAULT 'server',
      device_label VARCHAR(120),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_fcm_tokens_role ON fcm_tokens(role);
  `);
    logger_1.logger.info("FCM", "fcm_tokens schema ready");
}
//# sourceMappingURL=ensure-fcm-schema.js.map