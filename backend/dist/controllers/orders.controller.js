"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
exports.createOrderWithDeps = createOrderWithDeps;
exports.getOrders = getOrders;
const db_1 = require("../config/db");
const logger_1 = require("../utils/logger");
const sms_dispatch_service_1 = require("../services/sms-dispatch.service");
const CONTEXT = "ORDERS";
async function sendOrderSmsDefault(tableNumber, message, orderId) {
    return (0, sms_dispatch_service_1.dispatchOrderSms)({
        orderId: orderId ?? null,
        tableNumber,
        message,
    });
}
/**
 * POST /api/orders
 */
async function createOrder(req, res) {
    return createOrderWithDeps(req, res);
}
async function createOrderWithDeps(req, res, deps) {
    const db = deps?.pool ?? db_1.pool;
    const sendOrderSms = deps?.sendOrderSms ?? sendOrderSmsDefault;
    const { table_number, items } = req.body;
    if (!table_number) {
        logger_1.logger.warn(CONTEXT, "createOrder called without table_number");
        return res.status(400).json({ error: "table_number est requis." });
    }
    if (!Array.isArray(items) || items.length === 0) {
        logger_1.logger.warn(CONTEXT, `createOrder called with empty cart (table ${table_number})`);
        return res.status(400).json({ error: "Le panier est vide." });
    }
    const client = await db.connect();
    try {
        await client.query("BEGIN");
        const tableLookup = await client.query(`SELECT id FROM tables WHERE table_number = $1`, [table_number]);
        const tableId = tableLookup.rows[0]?.id || null;
        const totalAmount = items.reduce((sum, item) => sum + item.price * item.qty, 0);
        const orderResult = await client.query(`INSERT INTO orders (table_id, table_number, total_amount, sms_status) VALUES ($1, $2, $3, 'pending') RETURNING *`, [tableId, table_number, totalAmount]);
        const order = orderResult.rows[0];
        for (const item of items) {
            await client.query(`INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`, [order.id, item.id, item.name, item.price, item.qty, item.price * item.qty]);
        }
        await client.query("COMMIT");
        logger_1.logger.info(CONTEXT, `commande #${order.id} creee`, {
            orderId: order.id,
            tableNumber: table_number,
            tableId,
            itemCount: items.length,
            totalAmount,
            items: summarizeItems(items),
        });
        const smsMessage = buildSmsMessage(table_number, items, totalAmount);
        logger_1.logger.info(CONTEXT, `SMS prepare pour commande #${order.id}`, {
            orderId: order.id,
            tableNumber: table_number,
            messageLength: smsMessage.length,
            messagePreview: smsMessage.length > 140 ? `${smsMessage.slice(0, 137)}...` : smsMessage,
        });
        let smsResult = { success: false, errorMessage: "SMS non tente.", errorKind: "unknown" };
        try {
            logger_1.logger.info(CONTEXT, `SMS dispatch demarre pour commande #${order.id}`);
            smsResult = await sendOrderSms(table_number, smsMessage, order.id);
            logger_1.logger.info(CONTEXT, `SMS dispatch termine pour commande #${order.id}`, {
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
        }
        catch (smsErr) {
            smsResult = {
                success: false,
                errorMessage: smsErr?.message || "Erreur inattendue lors de l'envoi SMS.",
                errorKind: smsErr?.kind || "unknown",
            };
            logger_1.logger.error("SMS", `SMS dispatch failed for order #${order.id}`, smsErr);
        }
        try {
            await db.query(`UPDATE orders SET sms_status = $1, sms_error = $2 WHERE id = $3`, [
                smsResult.success ? "sent" : "failed",
                smsResult.success ? null : smsResult.errorMessage || null,
                order.id,
            ]);
            logger_1.logger.info(CONTEXT, `ordre #${order.id} mis a jour avec sms_status=${smsResult.success ? "sent" : "failed"}`);
        }
        catch (updateOrderErr) {
            logger_1.logger.error(CONTEXT, `Could not update sms_status for order #${order.id}`, updateOrderErr);
        }
        if (!smsResult.success) {
            logger_1.logger.warn("SMS", `Order #${order.id} stored but SMS failed: ${smsResult.errorMessage}`);
        }
        return res.status(201).json({
            order_id: order.id,
            total_amount: totalAmount,
            sms_status: smsResult.success ? "sent" : "failed",
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        logger_1.logger.error(CONTEXT, `createOrder failed for table ${table_number}`, err);
        return res.status(500).json({ error: "Erreur serveur lors de l'enregistrement de la commande.", detail: err.message });
    }
    finally {
        client.release();
    }
}
function buildSmsMessage(tableNumber, items, total) {
    const lines = items.map((i) => `${i.qty}x ${i.name}`).join(", ");
    return `NOUVELLE COMMANDE - Table ${tableNumber}: ${lines}. Total: ${total} FCFA.`;
}
function summarizeItems(items) {
    return items.map((item) => `${item.qty}x ${item.name}(${item.price})`).join(" | ");
}
/**
 * GET /api/orders
 */
async function getOrders(req, res) {
    try {
        const result = await db_1.pool.query(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 100`);
        return res.json(result.rows);
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, "getOrders failed", err);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération des commandes.", detail: err.message });
    }
}
//# sourceMappingURL=orders.controller.js.map