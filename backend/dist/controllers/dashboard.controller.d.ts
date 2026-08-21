import { Request, Response } from "express";
/**
 * GET /api/dashboard/stats
 * Retourne les statistiques simples pour le mini dashboard admin :
 * - nombre total de commandes
 * - chiffre d'affaires total
 * - commandes du jour
 * - top 5 produits les plus commandés
 * - commandes par table
 */
export declare function getStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=dashboard.controller.d.ts.map