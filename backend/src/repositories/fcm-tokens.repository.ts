import { pool } from "../config/db";

export async function upsertServerFcmToken(token: string, deviceLabel: string | null): Promise<void> {
  await pool.query(
    `INSERT INTO fcm_tokens (token, role, device_label)
     VALUES ($1, 'server', $2)
     ON CONFLICT (token) DO UPDATE SET
       role = 'server',
       device_label = COALESCE(EXCLUDED.device_label, fcm_tokens.device_label),
       updated_at = NOW(),
       last_seen_at = NOW()`,
    [token, deviceLabel]
  );
}

export async function getServerFcmTokens(): Promise<string[]> {
  const result = await pool.query(`SELECT token FROM fcm_tokens WHERE role = 'server' ORDER BY updated_at DESC`);
  return result.rows.map((row) => row.token as string);
}

export async function deleteFcmTokens(tokens: string[]): Promise<void> {
  if (tokens.length) await pool.query(`DELETE FROM fcm_tokens WHERE token = ANY($1::text[])`, [tokens]);
}
