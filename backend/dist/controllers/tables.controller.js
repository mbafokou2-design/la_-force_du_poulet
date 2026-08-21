"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTable = createTable;
exports.getTables = getTables;
exports.deleteTable = deleteTable;
const qrcode_1 = __importDefault(require("qrcode"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("../config/db");
const logger_1 = require("../utils/logger");
const CONTEXT = "tables.controller.ts";
const QR_FOLDER = path_1.default.join(__dirname, "..", "..", "public", "qrcodes");
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:5500";
// Crée le dossier qrcodes/ s'il n'existe pas encore
if (!fs_1.default.existsSync(QR_FOLDER)) {
    fs_1.default.mkdirSync(QR_FOLDER, { recursive: true });
    logger_1.logger.info(CONTEXT, `Dossier créé: ${QR_FOLDER}`);
}
/**
 * POST /api/tables
 * Crée une nouvelle table et génère son QR code (pointant vers le menu client).
 */
async function createTable(req, res) {
    const { table_number, location } = req.body;
    if (!table_number) {
        logger_1.logger.warn(CONTEXT, "createTable appelé sans table_number", req.body);
        return res.status(400).json({ error: "table_number est requis." });
    }
    try {
        const insertResult = await db_1.pool.query(`INSERT INTO tables (table_number, location) VALUES ($1, $2) RETURNING *`, [table_number, location || null]);
        const table = insertResult.rows[0];
        // URL que le client ouvrira en scannant le QR (le menu, avec le numéro de table en paramètre)
        const targetUrl = `${FRONTEND_BASE_URL}/index.html?table=${encodeURIComponent(table_number)}`;
        const fileName = `table-${table.id}.png`;
        const filePath = path_1.default.join(QR_FOLDER, fileName);
        await qrcode_1.default.toFile(filePath, targetUrl, { width: 500, margin: 2 });
        const qrCodePath = `/qrcodes/${fileName}`;
        await db_1.pool.query(`UPDATE tables SET qr_code_path = $1 WHERE id = $2`, [qrCodePath, table.id]);
        logger_1.logger.info(CONTEXT, `Table créée: #${table.id} (${table_number}), QR généré: ${qrCodePath}`);
        return res.status(201).json({ ...table, qr_code_path: qrCodePath, qr_target_url: targetUrl });
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, `Échec createTable pour table_number="${table_number}"`, err);
        // Cas fréquent : numéro de table déjà utilisé (contrainte UNIQUE)
        if (err.code === "23505") {
            return res.status(409).json({ error: `La table "${table_number}" existe déjà.` });
        }
        return res.status(500).json({ error: "Erreur serveur lors de la création de la table.", detail: err.message });
    }
}
/**
 * GET /api/tables
 * Liste toutes les tables avec leur QR code.
 */
async function getTables(req, res) {
    try {
        const result = await db_1.pool.query(`SELECT * FROM tables ORDER BY created_at DESC`);
        return res.json(result.rows);
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, "Échec getTables", err);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération des tables.", detail: err.message });
    }
}
/**
 * DELETE /api/tables/:id
 */
async function deleteTable(req, res) {
    const { id } = req.params;
    try {
        const table = await db_1.pool.query(`SELECT qr_code_path FROM tables WHERE id = $1`, [id]);
        if (table.rows.length === 0) {
            logger_1.logger.warn(CONTEXT, `deleteTable: table #${id} introuvable`);
            return res.status(404).json({ error: "Table introuvable." });
        }
        await db_1.pool.query(`DELETE FROM tables WHERE id = $1`, [id]);
        // Supprime aussi le fichier QR code du disque
        const qrPath = table.rows[0].qr_code_path;
        if (qrPath) {
            const fullPath = path_1.default.join(__dirname, "..", "..", "public", qrPath.replace("/qrcodes/", "qrcodes/"));
            if (fs_1.default.existsSync(fullPath))
                fs_1.default.unlinkSync(fullPath);
        }
        logger_1.logger.info(CONTEXT, `Table #${id} supprimée.`);
        return res.status(204).send();
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, `Échec deleteTable pour id=${id}`, err);
        return res.status(500).json({ error: "Erreur serveur lors de la suppression.", detail: err.message });
    }
}
//# sourceMappingURL=tables.controller.js.map