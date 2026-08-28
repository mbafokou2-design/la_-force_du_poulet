"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSmsSchema = ensureSmsSchema;
const db_1 = require("../config/db");
const logger_1 = require("../utils/logger");
const sms_recipients_repository_1 = require("../repositories/sms-recipients.repository");
const CONTEXT = "SMS";
async function ensureSmsSchema() {
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS sms_notifications (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      recipient_phone VARCHAR(32) NOT NULL,
      recipient_name VARCHAR(100),
      message TEXT NOT NULL,
      provider VARCHAR(20) NOT NULL DEFAULT 'ORANGE',
      orange_resource_id VARCHAR(255) UNIQUE,
      orange_request_id VARCHAR(255),
      status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
      orange_delivery_status VARCHAR(50),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
      accepted_at TIMESTAMP,
      sent_at TIMESTAMP,
      delivered_at TIMESTAMP,
      failed_at TIMESTAMP,
      callback_received_at TIMESTAMP,
      error_code VARCHAR(100),
      error_message TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TIMESTAMP,
      request_duration_ms INTEGER,
      delivery_latency_ms INTEGER,
      total_latency_ms INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_sms_notifications_order_id ON sms_notifications(order_id);
    CREATE INDEX IF NOT EXISTS idx_sms_notifications_created_at ON sms_notifications(created_at);
    CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status);
    CREATE INDEX IF NOT EXISTS idx_sms_notifications_provider ON sms_notifications(provider);
    CREATE INDEX IF NOT EXISTS idx_sms_notifications_recipient_phone ON sms_notifications(recipient_phone);
    CREATE INDEX IF NOT EXISTS idx_sms_notifications_orange_resource_id ON sms_notifications(orange_resource_id);

    CREATE TABLE IF NOT EXISTS sms_delivery_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      staff_phone_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
    const existing = await db_1.pool.query(`SELECT id FROM sms_delivery_settings WHERE id = 1`);
    if (existing.rows.length === 0) {
        await db_1.pool.query(`INSERT INTO sms_delivery_settings (id, staff_phone_numbers) VALUES ($1, $2::jsonb)`, [1, JSON.stringify((0, sms_recipients_repository_1.getDefaultSmsRecipients)())]);
    }
    logger_1.logger.info(CONTEXT, "SMS and FCM schemas ready");
}
//# sourceMappingURL=ensure-sms-schema.js.map