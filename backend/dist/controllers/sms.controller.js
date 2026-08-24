"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSmsStatsController = getSmsStatsController;
exports.listSmsNotificationsController = listSmsNotificationsController;
exports.getSmsNotificationController = getSmsNotificationController;
const logger_1 = require("../utils/logger");
const sms_notifications_repository_1 = require("../repositories/sms-notifications.repository");
const sms_1 = require("../utils/sms");
const CONTEXT = "SMS";
function parseIntOrNull(value) {
    if (value === undefined || value === null || value === "")
        return null;
    const num = Number(value);
    return Number.isFinite(num) ? Math.trunc(num) : null;
}
function parsePositiveInt(value, fallback) {
    const num = parseIntOrNull(value);
    if (!num || num < 1)
        return fallback;
    return num;
}
function parseDirection(value) {
    return String(value).toLowerCase() === "asc" ? "asc" : "desc";
}
function buildFilters(query) {
    return {
        page: parsePositiveInt(query.page, 1),
        limit: Math.min(parsePositiveInt(query.limit, 20), 100),
        status: typeof query.status === "string" && query.status ? query.status : undefined,
        provider: typeof query.provider === "string" && query.provider ? query.provider : undefined,
        orderId: parseIntOrNull(query.order_id ?? query.orderId) ?? undefined,
        phone: typeof query.phone === "string" && query.phone ? query.phone : undefined,
        table: typeof query.table === "string" && query.table ? query.table : undefined,
        from: typeof query.from === "string" && query.from ? query.from : undefined,
        to: typeof query.to === "string" && query.to ? query.to : undefined,
        sort: typeof query.sort === "string" && query.sort ? query.sort : undefined,
        direction: parseDirection(query.direction),
    };
}
function toIso(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return value.toISOString();
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function summarizeMessage(message) {
    const clean = message.replace(/\s+/g, " ").trim();
    if (clean.length <= 80)
        return clean;
    return `${clean.slice(0, 77)}...`;
}
function mapRow(row) {
    return {
        id: row.id,
        order_id: row.order_id,
        order_table_number: row.order_table_number || row.table_number || null,
        provider: row.provider,
        status: row.status,
        orange_delivery_status: row.orange_delivery_status,
        orange_resource_id: row.orange_resource_id,
        recipient_phone_masked: (0, sms_1.maskPhoneNumber)(row.recipient_phone),
        recipient_name: row.recipient_name,
        message_summary: summarizeMessage(row.message),
        message: row.message,
        created_at: toIso(row.created_at),
        requested_at: toIso(row.requested_at),
        accepted_at: toIso(row.accepted_at),
        sent_at: toIso(row.sent_at),
        delivered_at: toIso(row.delivered_at),
        failed_at: toIso(row.failed_at),
        callback_received_at: toIso(row.callback_received_at),
        error_code: row.error_code,
        error_message: row.error_message,
        retry_count: row.retry_count,
        last_attempt_at: toIso(row.last_attempt_at),
        request_duration_ms: row.request_duration_ms,
        delivery_latency_ms: row.delivery_latency_ms,
        total_latency_ms: row.total_latency_ms,
    };
}
async function getSmsStatsController(req, res) {
    try {
        const stats = await (0, sms_notifications_repository_1.getSmsStats)();
        return res.json({
            total_sms: Number(stats.total_sms || 0),
            accepted_sms: Number(stats.accepted_sms || 0),
            delivered_sms: Number(stats.delivered_sms || 0),
            pending_sms: Number(stats.pending_sms || 0),
            failed_sms: Number(stats.failed_sms || 0),
            delivery_rate: Number(stats.delivery_rate || 0),
            failure_rate: Number(stats.failure_rate || 0),
            avg_request_duration_ms: Number(stats.avg_request_duration_ms || 0),
            avg_delivery_latency_ms: Number(stats.avg_delivery_latency_ms || 0),
            min_request_duration_ms: Number(stats.min_request_duration_ms || 0),
            max_request_duration_ms: Number(stats.max_request_duration_ms || 0),
            min_delivery_latency_ms: Number(stats.min_delivery_latency_ms || 0),
            max_delivery_latency_ms: Number(stats.max_delivery_latency_ms || 0),
            recent_distribution: stats.recent_distribution || [],
        });
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, "getSmsStats failed", err);
        return res.status(500).json({ error: "Erreur serveur lors du calcul des statistiques SMS.", detail: err.message });
    }
}
async function listSmsNotificationsController(req, res) {
    const filters = buildFilters(req.query);
    try {
        const result = await (0, sms_notifications_repository_1.listSmsNotifications)(filters);
        const items = result.rows.map(mapRow);
        return res.json({
            items,
            page: filters.page,
            limit: filters.limit,
            total: result.total,
            total_pages: Math.max(1, Math.ceil(result.total / filters.limit)),
        });
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, "listSmsNotifications failed", err);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération des SMS.", detail: err.message });
    }
}
async function getSmsNotificationController(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id < 1) {
        return res.status(400).json({ error: "Identifiant SMS invalide." });
    }
    try {
        const row = await (0, sms_notifications_repository_1.findSmsNotificationById)(id);
        if (!row) {
            return res.status(404).json({ error: "SMS introuvable." });
        }
        return res.json(mapRow(row));
    }
    catch (err) {
        logger_1.logger.error(CONTEXT, `getSmsNotification failed for id=${id}`, err);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération du SMS.", detail: err.message });
    }
}
//# sourceMappingURL=sms.controller.js.map