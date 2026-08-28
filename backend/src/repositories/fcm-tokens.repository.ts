import { pool } from "../config/db";

export async function upsertServerFcmToken(token: string, deviceLabel: string | null, deviceId: string): Promise<void> {
  // A browser which obtains a new FCM token replaces its old token immediately.
  await pool.query(`DELETE FROM fcm_tokens WHERE role = 'server' AND device_id = $1 AND token <> $2`, [deviceId, token]);
  await pool.query(
    `INSERT INTO fcm_tokens (token, role, device_label, device_id)
     VALUES ($1, 'server', $2, $3)
     ON CONFLICT (token) DO UPDATE SET
       role = 'server',
       device_label = COALESCE(EXCLUDED.device_label, fcm_tokens.device_label),
       device_id = EXCLUDED.device_id,
       updated_at = NOW(),
       last_seen_at = NOW()`,
    [token, deviceLabel, deviceId]
  );
}

export async function getServerFcmTokens(): Promise<string[]> {
  const result = await pool.query(`SELECT token FROM fcm_tokens WHERE role = 'server' ORDER BY updated_at DESC`);
  return result.rows.map((row) => row.token as string);
}

export async function deleteFcmTokens(tokens: string[]): Promise<void> {
  if (tokens.length) await pool.query(`DELETE FROM fcm_tokens WHERE token = ANY($1::text[])`, [tokens]);
}

export async function getServerFcmTokenCount(): Promise<number> {
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM fcm_tokens WHERE role = 'server'`);
  return Number(result.rows[0]?.count || 0);
}