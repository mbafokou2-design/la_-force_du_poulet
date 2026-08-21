"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testConnection = testConnection;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (!process.env.DATABASE_URL) {
    // Erreur fatale au démarrage : impossible de continuer sans DB.
    console.error("[db.ts] ❌ ERREUR FATALE: DATABASE_URL est absent du fichier .env");
    process.exit(1);
}
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // requis par Neon
});
// Log toute erreur inattendue venant du pool (connexion coupée, etc.)
exports.pool.on("error", (err) => {
    console.error("[db.ts] ❌ Erreur inattendue sur le pool PostgreSQL:", err.message);
    console.error(err.stack);
});
// Test de connexion au démarrage — permet de savoir immédiatement si Neon est joignable
async function testConnection() {
    try {
        const client = await exports.pool.connect();
        const result = await client.query("SELECT NOW()");
        console.log(`[db.ts] ✅ Connexion Neon OK — heure serveur DB: ${result.rows[0].now}`);
        client.release();
    }
    catch (err) {
        console.error("[db.ts] ❌ ÉCHEC de connexion à Neon.");
        console.error("[db.ts] Détail:", err.message);
        console.error("[db.ts] Vérifie: 1) DATABASE_URL correct dans .env  2) ?sslmode=require présent  3) le projet Neon n'est pas en pause");
        throw err;
    }
}
//# sourceMappingURL=db.js.map