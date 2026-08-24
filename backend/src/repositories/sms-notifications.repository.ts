import { pool } from "../config/db";

export type SmsProvider = "ORANGE";

export type SmsStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DELIVERED"
  | "DELIVERED_TO_NETWORK"
  | "FAILED"
  | "UNKNOWN";

export type SmsNotificationRow = {
  id: number;
  order_id: number | null;
  recipient_phone: string;
  recipient_name: string | null;
  message: string;
  provider: SmsProvider;
  orange_resource_id: string | null;
  orange_request_id: string | null;
  status: SmsStatus;
  orange_delivery_status: string | null;
  created_at: string;
  requested_at: string;
  accepted_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  callback_received_at: string | null;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  last_attempt_at: string | null;
  request_duration_ms: number | null;
  delivery_latency_ms: number | null;
  total_latency_ms: number | null;
  order_table_number?: string | null;
};

export type SmsNotificationCreateInput = {
  orderId: number | null;
  recipientPhone: string;
  recipientName?: string | null;
  message: string;
  provider?: SmsProvider;
  requestedAt?: Date;
  retryCount?: number;
};

export type SmsNotificationAttemptUpdate = {
  status: SmsStatus;
  orangeResourceId?: string | null;
  orangeRequestId?: string | null;
  orangeDeliveryStatus?: string | null;
  acceptedAt?: Date | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  failedAt?: Date | null;
  callbackReceivedAt?: Date | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryCount?: number;
  lastAttemptAt?: Date | null;
  requestDurationMs?: number | null;
  deliveryLatencyMs?: number | null;
  totalLatencyMs?: number | null;
};

export type SmsNotificationFilters = {
  page: number;
  limit: number;
  status?: string;
  provider?: string;
  orderId?: number;
  phone?: string;
  table?: string;
  from?: string;
  to?: string;
  sort?: string;
  direction?: "asc" | "desc";
};

export function getSmsPool() {
  return pool;
}

export async function createSmsNotification(input: SmsNotificationCreateInput) {
  const result = await pool.query<SmsNotificationRow>(
    `INSERT INTO sms_notifications (
      order_id, recipient_phone, recipient_name, message, provider, requested_at, retry_count, status
     ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()), COALESCE($7, 0), 'PENDING')
     RETURNING *`,
    [
      input.orderId,
      input.recipientPhone,
      input.recipientName ?? null,
      input.message,
      input.provider ?? "ORANGE",
      input.requestedAt ?? null,
      input.retryCount ?? 0,
    ]
  );

  return result.rows[0];
}

export async function attachOrangeResourceId(id: number, orangeResourceId: string, orangeRequestId?: string | null) {
  const result = await pool.query<SmsNotificationRow>(
    `UPDATE sms_notifications
     SET orange_resource_id = COALESCE($2, orange_resource_id),
         orange_request_id = COALESCE($3, orange_request_id)
     WHERE id = $1
     RETURNING *`,
    [id, orangeResourceId, orangeRequestId ?? null]
  );
  return result.rows[0] ?? null;
}

export async function updateSmsNotificationById(
  id: number,
  patch: SmsNotificationAttemptUpdate
) {
  const result = await pool.query<SmsNotificationRow>(
    `UPDATE sms_notifications
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
     RETURNING *`,
    [
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
    ]
  );

  return result.rows[0] ?? null;
}

export async function updateSmsNotificationByOrangeResourceId(
  orangeResourceId: string,
  patch: SmsNotificationAttemptUpdate
) {
  const result = await pool.query<SmsNotificationRow>(
    `UPDATE sms_notifications
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
     RETURNING *`,
    [
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
    ]
  );

  return result.rows[0] ?? null;
}

export async function findSmsNotificationByOrangeResourceId(orangeResourceId: string) {
  const result = await pool.query<SmsNotificationRow>(
    `SELECT s.*, o.table_number AS order_table_number
     FROM sms_notifications s
     LEFT JOIN orders o ON o.id = s.order_id
     WHERE s.orange_resource_id = $1
     LIMIT 1`,
    [orangeResourceId]
  );

  return result.rows[0] ?? null;
}

export async function findSmsNotificationById(id: number) {
  const result = await pool.query<SmsNotificationRow>(
    `SELECT s.*, o.table_number AS order_table_number
     FROM sms_notifications s
     LEFT JOIN orders o ON o.id = s.order_id
     WHERE s.id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function listSmsNotifications(filters: SmsNotificationFilters) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  const addCondition = (sql: string, value: unknown) => {
    values.push(value);
    conditions.push(sql.replace("?", `$${values.length}`));
  };

  if (filters.status) addCondition(`s.status = ?`, filters.status);
  if (filters.provider) addCondition(`s.provider = ?`, filters.provider);
  if (filters.orderId) addCondition(`s.order_id = ?`, filters.orderId);
  if (filters.phone) addCondition(`s.recipient_phone ILIKE ?`, `%${filters.phone}%`);
  if (filters.table) addCondition(`o.table_number ILIKE ?`, `%${filters.table}%`);
  if (filters.from) addCondition(`s.created_at >= ?::timestamptz`, filters.from);
  if (filters.to) addCondition(`s.created_at <= ?::timestamptz`, filters.to);

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
    pool.query<SmsNotificationRow>(query, values),
    pool.query<{ total: number }>(countQuery, values.slice(0, values.length - 2)),
  ]);

  return {
    rows: rowsResult.rows,
    total: countResult.rows[0]?.total || 0,
  };
}

export async function getSmsStats() {
  const result = await pool.query(
    `
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
    `
  );

  return result.rows[0];
}

export async function findSmsStatsSummaryWindow(days = 7) {
  const result = await pool.query(
    `
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
    `,
    [days]
  );

  return result.rows;
}
