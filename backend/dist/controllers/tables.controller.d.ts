import { Request, Response } from "express";
/**
 * POST /api/tables
 * Crée une nouvelle table et génère son QR code (pointant vers le menu client).
 */
export declare function createTable(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/tables
 * Liste toutes les tables avec leur QR code.
 */
export declare function getTables(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * DELETE /api/tables/:id
 */
export declare function deleteTable(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=tables.controller.d.ts.map