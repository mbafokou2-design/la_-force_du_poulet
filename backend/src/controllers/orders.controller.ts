import { Request, Response } from "express";
import { pool } from "../config/db";
import { logger } from "../utils/logger";
import { SmsResult } from "../services/orange-sms.service";
import { dispatchOrderSms } from "../services/sms-dispatch.service";
import { dispatchOrderPush, type PushResult } from "../services/fcm.service";

const CONTEXT = "ORDERS";

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

type QueryablePool = {
  connect: () => Promise<{
    query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
    release: () => void;
  }>;
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
};

export type CreateOrderDependencies = {
  pool: QueryablePool;
  sendOrderSms: (tableNumber: string, message: string, orderId?: number) => Promise<SmsResult>;
  sendOrderPush: (input: { orderId: number; tableNumber: string; message: string }) => Promise<PushResult>;
};

async function sendOrderSmsDefault(tableNumber: string, message: string, orderId?: number): Promise<SmsResult> {
  return dispatchOrderSms({
    orderId: orderId ?? null,
    tableNumber,
    message,
  });
}

/**
 * POST /api/orders
 */
export async function createOrder(req: Request, res: Response) {
  return createOrderWithDeps(req, res);
}

export async function createOrderWithDeps(
  req: Request,
  res: Response,
  deps?: Partial<CreateOrderDependencies>
) {
  const db = deps?.pool ?? pool;
  const sendOrderSms = deps?.sendOrderSms ?? sendOrderSmsDefault;
  const sendOrderPush = deps?.sendOrderPush ?? (deps ? async () => ({ enabled: false, attempted: 0, sent: 0, failed: 0 }) : dispatchOrderPush);
  const { table_number, items } = req.body as { table_number: string; items: CartItem[] };

  if (!table_number) {
    logger.warn(CONTEXT, "createOrder called without table_number");
    return res.status(400).json({ error: "table_number est requis." });
  }

  if (!Array.isArray(items) || items.length === 0) {
    logger.warn(CONTEXT, `createOrder called with empty cart (table ${table_number})`);
    return res.status(400).json({ error: "Le panier est vide." });
  }

  const client = await db.connect();
  let order: { id: number; table_number: string; total_amount: number };
  let tableId: number | null = null;
  let totalAmount = 0;

  try {
    await client.query("BEGIN");

    const tableLookup = await client.query(`SELECT id FROM tables WHERE table_number = $1`, [table_number]);
    tableId = tableLookup.rows[0]?.id || null;

    totalAmount = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    const orderResult = await client.query(
      `INSERT INTO orders (table_id, table_number, total_amount, sms_status) VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [tableId, table_number, totalAmount]
    );
    order = orderResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, item.id, item.name, item.price, item.qty, item.price * item.qty]
      );
    }

    await client.query("COMMIT");
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr: any) {
      logger.error(CONTEXT, `Rollback failed for table ${table_number}`, rollbackErr);
    }
    logger.error(CONTEXT, `createOrder failed for table ${table_number}`, err);
    return res.status(500).json({ error: "Erreur serveur lors de l'enregistrement de la commande.", detail: err.message });
  } finally {
    client.release();
  }

  logger.info(CONTEXT, `commande #${order.id} creee`, {
    orderId: order.id,
    tableNumber: table_number,
    tableId,
    itemCount: items.length,
    totalAmount,
    items: summarizeItems(items),
  });

  const smsMessage = buildSmsMessage(table_number, items, totalAmount);
  logger.info(CONTEXT, `SMS prepare pour commande #${order.id}`, {
    orderId: order.id,
    tableNumber: table_number,
    messageLength: smsMessage.length,
    messagePreview: smsMessage.length > 140 ? `${smsMessage.slice(0, 137)}...` : smsMessage,
  });
  // Safety gate: Orange is never contacted unless explicitly enabled in the environment.
  const smsEnabled = process.env.SMS_ENABLED === "true";
  let smsResult: SmsResult = { success: false, errorMessage: "SMS disabled by SMS_ENABLED.", errorKind: "config" };

  const shouldTrySms = smsEnabled || Boolean(deps?.sendOrderSms);

  if (shouldTrySms) {
    try {
      logger.info(CONTEXT, `SMS dispatch demarre pour commande #${order.id}`);
      smsResult = await sendOrderSms(table_number, smsMessage, order.id);
      logger.info(CONTEXT, `SMS dispatch termine pour commande #${order.id}`, {
        orderId: order.id,
        success: smsResult.success,
        errorKind: smsResult.errorKind || null,
        errorMessage: smsResult.errorMessage || null,
        attemptCount: smsResult.attemptCount ?? 0,
        httpStatus: smsResult.httpStatus ?? null,
        orangeResourceId: smsResult.orangeResourceId ?? null,
        orangeRequestId: smsResult.orangeRequestId ?? null,
        acceptedAt: smsResult.acceptedAt || null,
        requestCompletedAt: smsResult.requestCompletedAt || null,
        requestDurationMs: smsResult.requestDurationMs ?? null,
      });
    } catch (smsErr: any) {
      smsResult = {
        success: false,
        errorMessage: smsErr?.message || "Erreur inattendue lors de l'envoi SMS.",
        errorKind: smsErr?.kind || "unknown",
      };
      logger.error("SMS", `SMS dispatch failed for order #${order.id}`, smsErr);
    }
  } else {
    logger.info("SMS", `SMS disabled: Orange not called for order #${order.id}`);
  }

  try {
    await db.query(`UPDATE orders SET sms_status = $1, sms_error = $2 WHERE id = $3`, [
      shouldTrySms ? (smsResult.success ? "sent" : "failed") : "disabled",
      smsResult.success ? null : smsResult.errorMessage || null,
      order.id,
    ]);
    logger.info(CONTEXT, `ordre #${order.id} mis a jour avec sms_status=${smsResult.success ? "sent" : "failed"}`);
  } catch (updateOrderErr: any) {
    logger.error(CONTEXT, `Could not update sms_status for order #${order.id}`, updateOrderErr);
  }

  let pushResult: PushResult = { enabled: false, attempted: 0, sent: 0, failed: 0 };
  try {
    pushResult = await sendOrderPush({ orderId: order.id, tableNumber: table_number, message: smsMessage });
  } catch (pushErr: any) {
    logger.error("FCM", `Push dispatch failed for order #${order.id}`, pushErr);
  }

  if (!smsResult.success) {
    logger.warn("SMS", `Order #${order.id} stored but SMS failed: ${smsResult.errorMessage}`);
  }

  return res.status(201).json({
    order_id: order.id,
    total_amount: totalAmount,
    sms_status: shouldTrySms ? (smsResult.success ? "sent" : "failed") : "disabled",
    push: pushResult,
  });
}

function buildSmsMessage(tableNumber: string, items: CartItem[], total: number): string {
  const lines = items.map((i) => `${i.qty}x ${i.name}`).join(", ");
  return `NOUVELLE COMMANDE - Table ${tableNumber}: ${lines}. Total: ${total} FCFA.`;
}

function summarizeItems(items: CartItem[]): string {
  return items.map((item) => `${item.qty}x ${item.name}(${item.price})`).join(" | ");
}

/**
 * GET /api/orders
 */
export async function getOrders(req: Request, res: Response) {
  try {
    const result = await pool.query(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 100`);
    return res.json(result.rows);
  } catch (err: any) {
    logger.error(CONTEXT, "getOrders failed", err);
    return res.status(500).json({ error: "Erreur serveur lors de la récupération des commandes.", detail: err.message });
  }
}
