import { Request, Response } from "express";
import { pool } from "../config/db";
import { logger } from "../utils/logger";
import { isDatabaseUnavailableError } from "../utils/db";

const CONTEXT = "dashboard.controller.ts";

/**
 * GET /api/dashboard/stats
 * Retourne les statistiques simples pour le mini dashboard admin :
 * - nombre total de commandes
 * - chiffre d'affaires total
 * - commandes du jour
 * - top 5 produits les plus commandés
 * - commandes par table
 */
export async function getStats(req: Request, res: Response) {
  try {
    const [totalsResult, todayResult, topProductsResult, byTableResult] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total_orders, COALESCE(SUM(total_amount), 0)::int AS total_revenue FROM orders`),

      pool.query(
        `SELECT COUNT(*)::int AS orders_today, COALESCE(SUM(total_amount), 0)::int AS revenue_today
         FROM orders WHERE created_at::date = CURRENT_DATE`
      ),

      pool.query(
        `SELECT product_name, SUM(quantity)::int AS total_quantity
         FROM order_items
         GROUP BY product_name
         ORDER BY total_quantity DESC
         LIMIT 5`
      ),

      pool.query(
        `SELECT table_number, COUNT(*)::int AS order_count, COALESCE(SUM(total_amount), 0)::int AS revenue
         FROM orders
         GROUP BY table_number
         ORDER BY order_count DESC`
      ),
    ]);

    return res.json({
      total_orders: totalsResult.rows[0].total_orders,
      total_revenue: totalsResult.rows[0].total_revenue,
      orders_today: todayResult.rows[0].orders_today,
      revenue_today: todayResult.rows[0].revenue_today,
      top_products: topProductsResult.rows,
      by_table: byTableResult.rows,
    });
  } catch (err: any) {
    logger.error(CONTEXT, "Échec getStats", err);
    if (isDatabaseUnavailableError(err)) {
      logger.warn(CONTEXT, "DB indisponible: retour des statistiques vides");
      return res.json({
        total_orders: 0,
        total_revenue: 0,
        orders_today: 0,
        revenue_today: 0,
        top_products: [],
        by_table: [],
      });
    }
    return res.status(500).json({ error: "Erreur serveur lors du calcul des statistiques.", detail: err.message });
  }
}
