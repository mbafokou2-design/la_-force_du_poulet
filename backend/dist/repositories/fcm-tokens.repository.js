"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertServerFcmToken = upsertServerFcmToken;
exports.getServerFcmTokens = getServerFcmTokens;
exports.deleteFcmTokens = deleteFcmTokens;
const db_1 = require("../config/db");
async function upsertServerFcmToken(token, deviceLabel) {
    await db_1.pool.query(`INSERT INTO fcm_tokens (token, role, device_label)
     VALUES ($1, 'server', $2)
     ON CONFLICT (token) DO UPDATE SET
       role = 'server',
       device_label = COALESCE(EXCLUDED.device_label, fcm_tokens.device_label),
       updated_at = NOW(),
       last_seen_at = NOW()`, [token, deviceLabel]);
}
async function getServerFcmTokens() {
    const result = await db_1.pool.query(`SELECT token FROM fcm_tokens WHERE role = 'server' ORDER BY updated_at DESC`);
    return result.rows.map((row) => row.token);
}
async function deleteFcmTokens(tokens) {
    if (tokens.length)
        await db_1.pool.query(`DELETE FROM fcm_tokens WHERE token = ANY($1::text[])`, [tokens]);
}
//# sourceMappingURL=fcm-tokens.repository.js.map