import { Request, Response } from "express";
import { SmsResult } from "../services/orange-sms.service";
type QueryablePool = {
    connect: () => Promise<{
        query: (sql: string, params?: unknown[]) => Promise<{
            rows: any[];
        }>;
        release: () => void;
    }>;
    query: (sql: string, params?: unknown[]) => Promise<{
        rows: any[];
    }>;
};
export type CreateOrderDependencies = {
    pool: QueryablePool;
    sendOrderSms: (tableNumber: string, message: string) => Promise<SmsResult>;
};
/**
 * POST /api/orders
 * Reçoit le panier validé depuis le frontend client, l'enregistre en base,
 * puis tente d'envoyer le SMS récap au staff via Orange SMS.
 * body: { table_number: string, items: CartItem[] }
 */
export declare function createOrder(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createOrderWithDeps(req: Request, res: Response, deps?: Partial<CreateOrderDependencies>): Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/orders
 * Liste des commandes (pour debug / vérif manuelle), la plus récente en premier.
 */
export declare function getOrders(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export {};
//# sourceMappingURL=orders.controller.d.ts.map