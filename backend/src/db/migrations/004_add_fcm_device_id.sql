ALTER TABLE fcm_tokens ADD COLUMN IF NOT EXISTS device_id VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_device_id ON fcm_tokens(device_id);