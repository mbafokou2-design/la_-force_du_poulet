import { Request, Response } from "express";
import QRCode from "qrcode";
import { pool } from "../config/db";
import { logger } from "../utils/logger";
import { isDatabaseUnavailableError } from "../utils/db";
import { resolvePublicBaseUrl } from "../utils/public-url";

const CONTEXT = "tables.controller.ts";

function buildTableMenuUrl(req: Request, tableNumber: string): string {
  return `${resolvePublicBaseUrl(req)}/index.html?table=${encodeURIComponent(tableNumber)}`;
}

function buildQrRoute(tableId: number): string {
  return `/api/tables/${tableId}/qr-code`;
}

function mapTableRow(req: Request, table: any) {
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
export async function createTable(req: Request, res: Response) {
  const { table_number, location } = req.body;

  if (!table_number) {
    logger.warn(CONTEXT, "createTable called without table_number", req.body);
    return res.status(400).json({ error: "table_number est requis." });
  }

  try {
    const insertResult = await pool.query(
      `INSERT INTO tables (table_number, location) VALUES ($1, $2) RETURNING *`,
      [table_number, location || null]
    );
    const table = insertResult.rows[0];
    const qrCodePath = buildQrRoute(table.id);

    await pool.query(`UPDATE tables SET qr_code_path = $1 WHERE id = $2`, [qrCodePath, table.id]);

    logger.info(CONTEXT, `Table created: #${table.id} (${table_number}), QR route: ${qrCodePath}`);

    return res.status(201).json(mapTableRow(req, table));
  } catch (err: any) {
    logger.error(CONTEXT, `Failed createTable for table_number="${table_number}"`, err);

    if (isDatabaseUnavailableError(err)) {
      logger.warn(CONTEXT, "DB unavailable: table creation disabled");
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
export async function getTables(req: Request, res: Response) {
  try {
    const result = await pool.query(`SELECT * FROM tables ORDER BY created_at DESC`);
    return res.json(result.rows.map((table) => mapTableRow(req, table)));
  } catch (err: any) {
    logger.error(CONTEXT, "Failed getTables", err);
    if (isDatabaseUnavailableError(err)) {
      logger.warn(CONTEXT, "DB unavailable: returning empty table list");
      return res.json([]);
    }
    return res.status(500).json({ error: "Erreur serveur lors de la recuperation des tables.", detail: err.message });
  }
}

/**
 * GET /api/tables/:id/qr-code
 * Generate the QR image on demand.
 */
export async function getTableQrCode(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const result = await pool.query(`SELECT id, table_number FROM tables WHERE id = $1`, [id]);
    const table = result.rows[0];

    if (!table) {
      return res.status(404).json({ error: "Table introuvable." });
    }

    const targetUrl = buildTableMenuUrl(req, table.table_number);
    const buffer = await QRCode.toBuffer(targetUrl, { width: 500, margin: 2 });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    return res.send(buffer);
  } catch (err: any) {
    logger.error(CONTEXT, `Failed getTableQrCode for id=${id}`, err);
    return res.status(500).json({ error: "Erreur serveur lors de la generation du QR code.", detail: err.message });
  }
}

/**
 * DELETE /api/tables/:id
 */
export async function deleteTable(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const table = await pool.query(`SELECT id FROM tables WHERE id = $1`, [id]);

    if (table.rows.length === 0) {
      logger.warn(CONTEXT, `deleteTable: table #${id} introuvable`);
      return res.status(404).json({ error: "Table introuvable." });
    }

    await pool.query(`DELETE FROM tables WHERE id = $1`, [id]);

    logger.info(CONTEXT, `Table #${id} supprimee.`);
    return res.status(204).send();
  } catch (err: any) {
    logger.error(CONTEXT, `Failed deleteTable for id=${id}`, err);
    return res.status(500).json({ error: "Erreur serveur lors de la suppression.", detail: err.message });
  }
}
