import { pool } from "../config/db";

const SETTINGS_TABLE = "sms_delivery_settings";
const SETTINGS_ID = 1;

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, " ");
}

function dedupePhones(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const phone = normalizePhone(value);
    if (!phone) continue;
    if (seen.has(phone)) continue;
    seen.add(phone);
    result.push(phone);
  }

  return result;
}

export function parseConfiguredPhoneNumbers(value: string | undefined | null): string[] {
  if (!value) return [];
  return dedupePhones(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
}

export function getDefaultSmsRecipients(): string[] {
  return parseConfiguredPhoneNumbers(process.env.STAFF_PHONE_NUMBERS || "");
}

export async function ensureSmsRecipientsConfig(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${SETTINGS_TABLE} (
      id INTEGER PRIMARY KEY CHECK (id = ${SETTINGS_ID}),
      staff_phone_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const current = await pool.query<{ staff_phone_numbers: string[] }>(
    `SELECT staff_phone_numbers FROM ${SETTINGS_TABLE} WHERE id = $1`,
    [SETTINGS_ID]
  );

  if (current.rows.length === 0) {
    await pool.query(
      `INSERT INTO ${SETTINGS_TABLE} (id, staff_phone_numbers) VALUES ($1, $2::jsonb)`,
      [SETTINGS_ID, JSON.stringify(getDefaultSmsRecipients())]
    );
  }
}

export async function getSmsRecipients(): Promise<string[]> {
  try {
    const result = await pool.query<{ staff_phone_numbers: string[] }>(
      `SELECT staff_phone_numbers FROM ${SETTINGS_TABLE} WHERE id = $1`,
      [SETTINGS_ID]
    );

    if (result.rows.length > 0) {
      const numbers = Array.isArray(result.rows[0].staff_phone_numbers)
        ? result.rows[0].staff_phone_numbers
        : [];
      return dedupePhones(numbers);
    }
  } catch {
    // Fallback to env values if the DB table is missing or temporarily unavailable.
  }

  return getDefaultSmsRecipients();
}

export async function setSmsRecipients(input: string[]): Promise<string[]> {
  const recipients = dedupePhones(input);
  await pool.query(
    `INSERT INTO ${SETTINGS_TABLE} (id, staff_phone_numbers, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id)
     DO UPDATE SET staff_phone_numbers = EXCLUDED.staff_phone_numbers, updated_at = NOW()`,
    [SETTINGS_ID, JSON.stringify(recipients)]
  );
  return recipients;
}

export async function addSmsRecipient(phone: string): Promise<string[]> {
  const current = await getSmsRecipients();
  const next = dedupePhones([...current, phone]);
  return setSmsRecipients(next);
}

export async function removeSmsRecipient(phone: string): Promise<string[]> {
  const target = normalizePhone(phone);
  const current = await getSmsRecipients();
  const next = current.filter((value) => normalizePhone(value) !== target);
  return setSmsRecipients(next);
}
