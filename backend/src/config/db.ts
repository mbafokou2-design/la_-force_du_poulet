import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  // Erreur fatale au démarrage : impossible de continuer sans DB.
  console.error("[db.ts] ❌ ERREUR FATALE: DATABASE_URL est absent du fichier .env");
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // requis par Neon
});

// Log toute erreur inattendue venant du pool (connexion coupée, etc.)
pool.on("error", (err) => {
  console.error("[db.ts] ❌ Erreur inattendue sur le pool PostgreSQL:", err.message);
  console.error(err.stack);
});

// Test de connexion au démarrage — permet de savoir immédiatement si Neon est joignable
export async function testConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    console.log(`[db.ts] ✅ Connexion Neon OK — heure serveur DB: ${result.rows[0].now}`);
    client.release();
  } catch (err: any) {
    console.error("[db.ts] ❌ ÉCHEC de connexion à Neon.");
    console.error("[db.ts] Détail:", err.message);
    console.error("[db.ts] Vérifie: 1) DATABASE_URL correct dans .env  2) ?sslmode=require présent  3) le projet Neon n'est pas en pause");
    throw err;
  }
}