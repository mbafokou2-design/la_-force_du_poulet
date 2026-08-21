"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
exports.createOrderWithDeps = createOrderWithDeps;
exports.getOrders = getOrders;
const db_1 = require("../config/db");
const logger_1 = require("../utils/logger");
const orange_sms_service_1 = require("../services/orange-sms.service");
const CONTEXT = "orders.controller.ts";
/**
 * POST /api/orders
 * Reçoit le panier validé depuis le frontend client, l'enregistre en base,
 * puis tente d'envoyer le SMS récap au staff via Orange SMS.
 * body: { table_number: string, items: CartItem[] }
 */
async function createOrder(req, res) {
    return createOrderWithDeps(req, res);
}
async function createOrderWithDeps(req, res, deps) {
    const db = deps?.pool ?? db_1.pool;
    const sendOrderSms = deps?.sendOrderSms ?? orange_sms_service_1.sendOrderSms;
    const { table_number, items } = req.body;
    // --- Validation d'entrée ---
    if (!table_number) {
        logger_1.logger.warn(CONTEXT, "createOrder appelé sans table_number", req.body);
        return res.status(400).json({ error: "table_number est requis." });
    }
    if (!Array.isArray(items) || items.length === 0) {
        logger_1.logger.warn(CONTEXT, `createOrder appelé avec un panier vide (table ${table_number})`);
        return res.status(400).json({ error: "Le panier est vide." });
    }
    const client = await db.connect();
    try {
        await client.query("BEGIN");
        // Cherche l'id de la table si elle existe (sinon on garde juste le numéro brut)
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
        logger_1.logger.info(CONTEXT, `commande créée #${order.id} pour la table ${table_number} — ${totalAmount} FCFA`);
        // --- Envoi SMS : ne doit jamais faire échouer la commande ---
        let smsResult = { success: false, errorMessage: "SMS non tenté." };
        try {
            const smsMessage = buildSmsMessage(table_number, items, totalAmount);
            smsResult = await sendOrderSms(table_number, smsMessage);
        }
        catch (smsErr) {
            smsResult = {
                success: false,
                errorMessage: smsErr?.message || "Erreur inattendue lors de l'envoi SMS.",
            };
            logger_1.logger.error(CONTEXT, `SMS a levé une exception après commande #${order.id}`, smsErr);
        }
        try {
            await db.query(`UPDATE orders SET sms_status = $1, sms_error = $2 WHERE id = $3`, [smsResult.success ? "sent" : "failed", smsResult.errorMessage || null, order.id]);
        }
        catch (updateErr) {
            logger_1.logger.error(CONTEXT, `Commande #${order.id} créée mais mise à jour sms_status impossible`, updateErr);
        }
        if (!smsResult.success) {
            logger_1.logger.warn(CONTEXT, `Commande #${order.id} enregistrée mais SMS non envoyé: ${smsResult.errorMessage}`);
        }
        return res.status(201).json({
            order_id: order.id,
            total_amount: totalAmount,
            sms_status: smsResult.success ? "sent" : "failed",
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        logger_1.logger.error(CONTEXT, `Échec createOrder pour la table ${table_number}`, err);
        return res.status(500).json({ error: "Erreur serveur lors de l'enregistrement de la commande.", detail: err.message });
    }
    finally {
        client.release();
    }
}
function buildSmsMessage(tableNumber, items, total) {
    const lines = items.map((i) => `${i.qty}x ${i.name}`).join(", ");
    return `NOUVELLE COMMANDE — Table ${tableNumber}: ${lines}. Total: ${total} FCFA.`;
}
/**
 * GET /api/orders
 * Liste des commandes (pour debug / vérif manuelle), la plus récente en premier.
 */
async function getOrders(req, res) {
    try {
        const result = await db_1.pool.query(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 100`);
        return res.json(result.rows);
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, "Échec getOrders", err);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération des commandes.", detail: err.message });
    }
}
//# sourceMappingURL=orders.controller.js.map