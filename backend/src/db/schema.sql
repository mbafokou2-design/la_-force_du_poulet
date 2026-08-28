-- =================================================================
-- LA FORCE DU POULET — SCHEMA POSTGRESQL (Neon)
-- =================================================================

CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  table_number VARCHAR(20) NOT NULL UNIQUE,
  location VARCHAR(50), -- ex: Mvog Mbi, Ngousso, Bonaberi...
  qr_code_path TEXT,     -- chemin du fichier PNG généré
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
  table_number VARCHAR(20) NOT NULL, -- copié au moment de la commande (garde l'historique même si la table est supprimée)
  total_amount INTEGER NOT NULL,     -- en FCFA
  customer_note TEXT,                -- instruction speciale du client
  sms_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | sent | failed
  sms_error TEXT,                    -- message d'erreur SMS (Orange) si échec
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_order_id ON sms_notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_created_at ON sms_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_provider ON sms_notifications(provider);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_recipient_phone ON sms_notifications(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_orange_resource_id ON sms_notifications(orange_resource_id);

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  role VARCHAR(30) NOT NULL DEFAULT 'server',
  device_label VARCHAR(120),
  device_id VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_role ON fcm_tokens(role);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_device_id ON fcm_tokens(device_id);
