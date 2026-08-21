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

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);