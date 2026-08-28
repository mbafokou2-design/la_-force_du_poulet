"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTable = createTable;
exports.getTables = getTables;
exports.getTableQrCode = getTableQrCode;
exports.deleteTable = deleteTable;
const qrcode_1 = __importDefault(require("qrcode"));
const db_1 = require("../config/db");
const logger_1 = require("../utils/logger");
const db_2 = require("../utils/db");
const public_url_1 = require("../utils/public-url");
const CONTEXT = "tables.controller.ts";
function buildTableMenuUrl(req, tableNumber) {
    return `${(0, public_url_1.resolvePublicBaseUrl)(req)}/index.html?table=${encodeURIComponent(tableNumber)}`;
}
function buildQrRoute(tableId) {
    return `/api/tables/${tableId}/qr-code`;
}
function mapTableRow(req, table) {
    return {
        ...table,
        qr_code_path: buildQrRoute(table.id),
        qr_target_url: buildTableMenuUrl(req, table.table_number),
    };
}
/**
 * POST /api/tables
 * Create a new table and generate its QR target.
 */
async function createTable(req, res) {
    const { table_number, location } = req.body;
    if (!table_number) {
        logger_1.logger.warn(CONTEXT, "createTable called without table_number", req.body);
        return res.status(400).json({ error: "table_number est requis." });
    }
    try {
        const insertResult = await db_1.pool.query(`INSERT INTO tables (table_number, location) VALUES ($1, $2) RETURNING *`, [table_number, location || null]);
        const table = insertResult.rows[0];
        const qrCodePath = buildQrRoute(table.id);
        await db_1.pool.query(`UPDATE tables SET qr_code_path = $1 WHERE id = $2`, [qrCodePath, table.id]);
        logger_1.logger.info(CONTEXT, `Table created: #${table.id} (${table_number}), QR route: ${qrCodePath}`);
        return res.status(201).json(mapTableRow(req, table));
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, `Failed createTable for table_number="${table_number}"`, err);
        if ((0, db_2.isDatabaseUnavailableError)(err)) {
            logger_1.logger.warn(CONTEXT, "DB unavailable: table creation disabled");
            return res.status(503).json({
                error: "Base de donnees indisponible. Impossible de creer la table pour le moment.",
            });
        }
        if (err.code === "23505") {
            return res.status(409).json({ error: `La table "${table_number}" existe deja.` });
        }
        return res.status(500).json({ error: "Erreur serveur lors de la creation de la table.", detail: err.message });
    }
}
/**
 * GET /api/tables
 * List tables with their QR target and QR route.
 */
async function getTables(req, res) {
    try {
        const result = await db_1.pool.query(`SELECT * FROM tables ORDER BY created_at DESC`);
        return res.json(result.rows.map((table) => mapTableRow(req, table)));
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, "Failed getTables", err);
        if ((0, db_2.isDatabaseUnavailableError)(err)) {
            logger_1.logger.warn(CONTEXT, "DB unavailable: returning empty table list");
            return res.json([]);
        }
        return res.status(500).json({ error: "Erreur serveur lors de la recuperation des tables.", detail: err.message });
    }
}
/**
 * GET /api/tables/:id/qr-code
 * Generate the QR image on demand.
 */
async function getTableQrCode(req, res) {
    const { id } = req.params;
    try {
        const result = await db_1.pool.query(`SELECT id, table_number FROM tables WHERE id = $1`, [id]);
        const table = result.rows[0];
        if (!table) {
            return res.status(404).json({ error: "Table introuvable." });
        }
        const targetUrl = buildTableMenuUrl(req, table.table_number);
        const buffer = await qrcode_1.default.toBuffer(targetUrl, { width: 500, margin: 2 });
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store");
        return res.send(buffer);
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, `Failed getTableQrCode for id=${id}`, err);
        return res.status(500).json({ error: "Erreur serveur lors de la generation du QR code.", detail: err.message });
    }
}
/**
 * DELETE /api/tables/:id
 */
async function deleteTable(req, res) {
    const { id } = req.params;
    try {
        const table = await db_1.pool.query(`SELECT id FROM tables WHERE id = $1`, [id]);
        if (table.rows.length === 0) {
            logger_1.logger.warn(CONTEXT, `deleteTable: table #${id} introuvable`);
            return res.status(404).json({ error: "Table introuvable." });
        }
        await db_1.pool.query(`DELETE FROM tables WHERE id = $1`, [id]);
        logger_1.logger.info(CONTEXT, `Table #${id} supprimee.`);
        return res.status(204).send();
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, `Failed deleteTable for id=${id}`, err);
        return res.status(500).json({ error: "Erreur serveur lors de la suppression.", detail: err.message });
    }
}
//# sourceMappingURL=tables.controller.js.map