import { Request, Response } from "express";
/**
 * POST /api/tables
 * Create a new table and generate its QR target.
 */
export declare function createTable(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/tables
 * List tables with their QR target and QR route.
 */
export declare function getTables(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/tables/:id/qr-code
 * Generate the QR image on demand.
 */
export declare function getTableQrCode(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * DELETE /api/tables/:id
 */
export declare function deleteTable(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=tables.controller.d.ts.map