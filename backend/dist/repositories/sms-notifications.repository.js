"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSmsPool = getSmsPool;
exports.createSmsNotification = createSmsNotification;
exports.attachOrangeResourceId = attachOrangeResourceId;
exports.updateSmsNotificationById = updateSmsNotificationById;
exports.updateSmsNotificationByOrangeResourceId = updateSmsNotificationByOrangeResourceId;
exports.findSmsNotificationByOrangeResourceId = findSmsNotificationByOrangeResourceId;
exports.findSmsNotificationById = findSmsNotificationById;
exports.listSmsNotifications = listSmsNotifications;
exports.getSmsStats = getSmsStats;
exports.findSmsStatsSummaryWindow = findSmsStatsSummaryWindow;
const db_1 = require("../config/db");
function getSmsPool() {
    return db_1.pool;
}
async function createSmsNotification(input) {
    const result = await db_1.pool.query(`INSERT INTO sms_notifications (
      order_id, recipient_phone, recipient_name, message, provider, requested_at, retry_count, status
     ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()), COALESCE($7, 0), 'PENDING')
     RETURNING *`, [
        input.orderId,
        input.recipientPhone,
        input.recipientName ?? null,
        input.message,
        input.provider ?? "ORANGE",
        input.requestedAt ?? null,
        input.retryCount ?? 0,
    ]);
    return result.rows[0];
}
async function attachOrangeResourceId(id, orangeResourceId, orangeRequestId) {
    const result = await db_1.pool.query(`UPDATE sms_notifications
     SET orange_resource_id = COALESCE($2, orange_resource_id),
         orange_request_id = COALESCE($3, orange_request_id)
     WHERE id = $1
     RETURNING *`, [id, orangeResourceId, orangeRequestId ?? null]);
    return result.rows[0] ?? null;
}
async function updateSmsNotificationById(id, patch) {
    const result = await db_1.pool.query(`UPDATE sms_notifications
     SET status = $2,
         orange_resource_id = COALESCE($3, orange_resource_id),
         orange_request_id = COALESCE($4, orange_request_id),
         orange_delivery_status = COALESCE($5, orange_delivery_status),
         accepted_at = COALESCE($6, accepted_at),
         sent_at = COALESCE($7, sent_at),
         delivered_at = COALESCE($8, delivered_at),
         failed_at = COALESCE($9, failed_at),
         callback_received_at = COALESCE($10, callback_received_at),
         error_code = $11,
         error_message = $12,
         retry_count = COALESCE($13, retry_count),
         last_attempt_at = COALESCE($14, last_attempt_at),
         request_duration_ms = COALESCE($15, request_duration_ms),
         delivery_latency_ms = COALESCE($16, delivery_latency_ms),
         total_latency_ms = COALESCE($17, total_latency_ms)
     WHERE id = $1
     RETURNING *`, [
        id,
        patch.status,
        patch.orangeResourceId ?? null,
        patch.orangeRequestId ?? null,
        patch.orangeDeliveryStatus ?? null,
        patch.acceptedAt ?? null,
        patch.sentAt ?? null,
        patch.deliveredAt ?? null,
        patch.failedAt ?? null,
        patch.callbackReceivedAt ?? null,
        patch.errorCode ?? null,
        patch.errorMessage ?? null,
        patch.retryCount ?? null,
        patch.lastAttemptAt ?? null,
        patch.requestDurationMs ?? null,
        patch.deliveryLatencyMs ?? null,
        patch.totalLatencyMs ?? null,
    ]);
    return result.rows[0] ?? null;
}
async function updateSmsNotificationByOrangeResourceId(orangeResourceId, patch) {
    const result = await db_1.pool.query(`UPDATE sms_notifications
     SET status = $2,
         orange_request_id = COALESCE($3, orange_request_id),
         orange_delivery_status = COALESCE($4, orange_delivery_status),
         accepted_at = COALESCE($5, accepted_at),
         sent_at = COALESCE($6, sent_at),
         delivered_at = COALESCE($7, delivered_at),
         failed_at = COALESCE($8, failed_at),
         callback_received_at = COALESCE($9, callback_received_at),
         error_code = $10,
         error_message = $11,
         retry_count = COALESCE($12, retry_count),
         last_attempt_at = COALESCE($13, last_attempt_at),
         request_duration_ms = COALESCE($14, request_duration_ms),
         delivery_latency_ms = COALESCE($15, delivery_latency_ms),
         total_latency_ms = COALESCE($16, total_latency_ms)
     WHERE orange_resource_id = $1
     RETURNING *`, [
        orangeResourceId,
        patch.status,
        patch.orangeRequestId ?? null,
        patch.orangeDeliveryStatus ?? null,
        patch.acceptedAt ?? null,
        patch.sentAt ?? null,
        patch.deliveredAt ?? null,
        patch.failedAt ?? null,
        patch.callbackReceivedAt ?? null,
        patch.errorCode ?? null,
        patch.errorMessage ?? null,
        patch.retryCount ?? null,
        patch.lastAttemptAt ?? null,
        patch.requestDurationMs ?? null,
        patch.deliveryLatencyMs ?? null,
        patch.totalLatencyMs ?? null,
    ]);
    return result.rows[0] ?? null;
}
async function findSmsNotificationByOrangeResourceId(orangeResourceId) {
    const result = await db_1.pool.query(`SELECT s.*, o.table_number AS order_table_number
     FROM sms_notifications s
     LEFT JOIN orders o ON o.id = s.order_id
     WHERE s.orange_resource_id = $1
     LIMIT 1`, [orangeResourceId]);
    return result.rows[0] ?? null;
}
async function findSmsNotificationById(id) {
    const result = await db_1.pool.query(`SELECT s.*, o.table_number AS order_table_number
     FROM sms_notifications s
     LEFT JOIN orders o ON o.id = s.order_id
     WHERE s.id = $1
     LIMIT 1`, [id]);
    return result.rows[0] ?? null;
}
async function listSmsNotifications(filters) {
    const conditions = [];
    const values = [];
    const addCondition = (sql, value) => {
        values.push(value);
        conditions.push(sql.replace("?", `$${values.length}`));
    };
    if (filters.status)
        addCondition(`s.status = ?`, filters.status);
    if (filters.provider)
        addCondition(`s.provider = ?`, filters.provider);
    if (filters.orderId)
        addCondition(`s.order_id = ?`, filters.orderId);
    if (filters.phone)
        addCondition(`s.recipient_phone ILIKE ?`, `%${filters.phone}%`);
    if (filters.table)
        addCondition(`o.table_number ILIKE ?`, `%${filters.table}%`);
    if (filters.from)
        addCondition(`s.created_at >= ?::timestamptz`, filters.from);
    if (filters.to)
        addCondition(`s.created_at <= ?::timestamptz`, filters.to);
    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const allowedSortColumns = new Set([
        "created_at",
        "requested_at",
        "accepted_at",
        "delivered_at",
        "failed_at",
        "status",
        "request_duration_ms",
        "delivery_latency_ms",
        "id",
    ]);
    const sortColumn = allowedSortColumns.has(filters.sort || "") ? filters.sort : "created_at";
    const direction = filters.direction === "asc" ? "ASC" : "DESC";
    const offset = (filters.page - 1) * filters.limit;
    const limitIndex = values.length + 1;
    const offsetIndex = values.length + 2;
    values.push(filters.limit, offset);
    const query = `
    SELECT s.*, o.table_number AS order_table_number
    FROM sms_notifications s
    LEFT JOIN orders o ON o.id = s.order_id
    ${whereClause}
    ORDER BY s.${sortColumn} ${direction}
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;
    const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM sms_notifications s
    LEFT JOIN orders o ON o.id = s.order_id
    ${whereClause}
  `;
    const [rowsResult, countResult] = await Promise.all([
        db_1.pool.query(query, values),
        db_1.pool.query(countQuery, values.slice(0, values.length - 2)),
    ]);
    return {
        rows: rowsResult.rows,
        total: countResult.rows[0]?.total || 0,
    };
}
async function getSmsStats() {
    const result = await db_1.pool.query(`
    SELECT
      COUNT(*)::int AS total_sms,
      COUNT(*) FILTER (WHERE status IN ('ACCEPTED', 'DELIVERED_TO_NETWORK', 'DELIVERED', 'PENDING', 'UNKNOWN'))::int AS accepted_sms,
      COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered_sms,
      COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_sms,
      COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed_sms,
      ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'DELIVERED') / NULLIF(COUNT(*), 0), 2) AS delivery_rate,
      ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'FAILED') / NULLIF(COUNT(*), 0), 2) AS failure_rate,
      COALESCE(ROUND(AVG(request_duration_ms))::int, 0) AS avg_request_duration_ms,
      COALESCE(ROUND(AVG(delivery_latency_ms))::int, 0) AS avg_delivery_latency_ms,
      COALESCE(MIN(request_duration_ms), 0)::int AS min_request_duration_ms,
      COALESCE(MAX(request_duration_ms), 0)::int AS max_request_duration_ms,
      COALESCE(MIN(delivery_latency_ms), 0)::int AS min_delivery_latency_ms,
      COALESCE(MAX(delivery_latency_ms), 0)::int AS max_delivery_latency_ms,
      COALESCE((
        SELECT json_agg(day_row ORDER BY day_row.day DESC)
        FROM (
          SELECT
            created_at::date AS day,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered,
            COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed,
            COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending
          FROM sms_notifications
          WHERE created_at >= NOW() - INTERVAL '7 days'
          GROUP BY created_at::date
        ) AS day_row
      ), '[]'::json) AS recent_distribution
    FROM sms_notifications
    `);
    return result.rows[0];
}
async function findSmsStatsSummaryWindow(days = 7) {
    const result = await db_1.pool.query(`
    SELECT
      created_at::date AS day,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered,
      COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed,
      COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending
    FROM sms_notifications
    WHERE created_at >= NOW() - ($1::text || ' days')::interval
    GROUP BY created_at::date
    ORDER BY day DESC
    `, [days]);
    return result.rows;
}
//# sourceMappingURL=sms-notifications.repository.js.map