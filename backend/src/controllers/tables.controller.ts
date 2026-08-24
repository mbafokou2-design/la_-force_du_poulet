import { Request, Response } from "express";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import { pool } from "../config/db";
import { logger } from "../utils/logger";
import { isDatabaseUnavailableError } from "../utils/db";

const CONTEXT = "tables.controller.ts";

const QR_FOLDER = path.join(__dirname, "..", "..", "public", "qrcodes");
const FRONTEND_BASE_URL =
  process.env.PUBLIC_BASE_URL ||
  process.env.FRONTEND_BASE_URL ||
  "http://localhost:4000";

// Crée le dossier qrcodes/ s'il n'existe pas encore
if (!fs.existsSync(QR_FOLDER)) {
  fs.mkdirSync(QR_FOLDER, { recursive: true });
  logger.info(CONTEXT, `Dossier créé: ${QR_FOLDER}`);
}

/**
 * POST /api/tables
 * Crée une nouvelle table et génère son QR code (pointant vers le menu client).
 */
export async function createTable(req: Request, res: Response) {
  const { table_number, location } = req.body;

  if (!table_number) {
    logger.warn(CONTEXT, "createTable appelé sans table_number", req.body);
    return res.status(400).json({ error: "table_number est requis." });
  }

  try {
    const insertResult = await pool.query(
      `INSERT INTO tables (table_number, location) VALUES ($1, $2) RETURNING *`,
      [table_number, location || null]
    );
    const table = insertResult.rows[0];

    // URL que le client ouvrira en scannant le QR (le menu, avec le numéro de table en paramètre)
    const targetUrl = `${FRONTEND_BASE_URL}/index.html?table=${encodeURIComponent(table_number)}`;
    const fileName = `table-${table.id}.png`;
    const filePath = path.join(QR_FOLDER, fileName);

    await QRCode.toFile(filePath, targetUrl, { width: 500, margin: 2 });

    const qrCodePath = `/qrcodes/${fileName}`;
    await pool.query(`UPDATE tables SET qr_code_path = $1 WHERE id = $2`, [qrCodePath, table.id]);

    logger.info(CONTEXT, `Table créée: #${table.id} (${table_number}), QR généré: ${qrCodePath}`);

    return res.status(201).json({ ...table, qr_code_path: qrCodePath, qr_target_url: targetUrl });
  } catch (err: any) {
    logger.error(CONTEXT, `Échec createTable pour table_number="${table_number}"`, err);

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
export async function getTables(req: Request, res: Response) {
  try {
    const result = await pool.query(`SELECT * FROM tables ORDER BY created_at DESC`);
    return res.json(result.rows);
  } catch (err: any) {
    logger.error(CONTEXT, "Échec getTables", err);
    if (isDatabaseUnavailableError(err)) {
      logger.warn(CONTEXT, "DB indisponible: retour d'une liste de tables vide");
      return res.json([]);
    }
    return res.status(500).json({ error: "Erreur serveur lors de la récupération des tables.", detail: err.message });
  }
}

/**
 * DELETE /api/tables/:id
 */
export async function deleteTable(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const table = await pool.query(`SELECT qr_code_path FROM tables WHERE id = $1`, [id]);

    if (table.rows.length === 0) {
      logger.warn(CONTEXT, `deleteTable: table #${id} introuvable`);
      return res.status(404).json({ error: "Table introuvable." });
    }

    await pool.query(`DELETE FROM tables WHERE id = $1`, [id]);

    // Supprime aussi le fichier QR code du disque
    const qrPath = table.rows[0].qr_code_path;
    if (qrPath) {
      const fullPath = path.join(__dirname, "..", "..", "public", qrPath.replace("/qrcodes/", "qrcodes/"));
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    logger.info(CONTEXT, `Table #${id} supprimée.`);
    return res.status(204).send();
  } catch (err: any) {
    logger.error(CONTEXT, `Échec deleteTable pour id=${id}`, err);
    return res.status(500).json({ error: "Erreur serveur lors de la suppression.", detail: err.message });
  }
}
