import { pool } from "../config/db";
import { logger } from "../utils/logger";

const CONTEXT = "SMS";

export async function ensureSmsSchema(): Promise<void> {
  await pool.query(`
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
  `);

  logger.info(CONTEXT, "sms_notifications schema ready");
}

