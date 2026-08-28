"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseConfiguredPhoneNumbers = parseConfiguredPhoneNumbers;
exports.getDefaultSmsRecipients = getDefaultSmsRecipients;
exports.ensureSmsRecipientsConfig = ensureSmsRecipientsConfig;
exports.getSmsRecipients = getSmsRecipients;
exports.setSmsRecipients = setSmsRecipients;
exports.addSmsRecipient = addSmsRecipient;
exports.removeSmsRecipient = removeSmsRecipient;
const db_1 = require("../config/db");
const SETTINGS_TABLE = "sms_delivery_settings";
const SETTINGS_ID = 1;
function normalizePhone(phone) {
    return phone.trim().replace(/\s+/g, " ");
}
function dedupePhones(values) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const phone = normalizePhone(value);
        if (!phone)
            continue;
        if (seen.has(phone))
            continue;
        seen.add(phone);
        result.push(phone);
    }
    return result;
}
function parseConfiguredPhoneNumbers(value) {
    if (!value)
        return [];
    return dedupePhones(value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean));
}
function getDefaultSmsRecipients() {
    return parseConfiguredPhoneNumbers(process.env.STAFF_PHONE_NUMBERS || "");
}
async function ensureSmsRecipientsConfig() {
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS ${SETTINGS_TABLE} (
      id INTEGER PRIMARY KEY CHECK (id = ${SETTINGS_ID}),
      staff_phone_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
    const current = await db_1.pool.query(`SELECT staff_phone_numbers FROM ${SETTINGS_TABLE} WHERE id = $1`, [SETTINGS_ID]);
    if (current.rows.length === 0) {
        await db_1.pool.query(`INSERT INTO ${SETTINGS_TABLE} (id, staff_phone_numbers) VALUES ($1, $2::jsonb)`, [SETTINGS_ID, JSON.stringify(getDefaultSmsRecipients())]);
    }
}
async function getSmsRecipients() {
    try {
        const result = await db_1.pool.query(`SELECT staff_phone_numbers FROM ${SETTINGS_TABLE} WHERE id = $1`, [SETTINGS_ID]);
        if (result.rows.length > 0) {
            const numbers = Array.isArray(result.rows[0].staff_phone_numbers)
                ? result.rows[0].staff_phone_numbers
                : [];
            return dedupePhones(numbers);
        }
    }
    catch {
        // Fallback to env values if the DB table is missing or temporarily unavailable.
    }
    return getDefaultSmsRecipients();
}
async function setSmsRecipients(input) {
    const recipients = dedupePhones(input);
    await db_1.pool.query(`INSERT INTO ${SETTINGS_TABLE} (id, staff_phone_numbers, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id)
     DO UPDATE SET staff_phone_numbers = EXCLUDED.staff_phone_numbers, updated_at = NOW()`, [SETTINGS_ID, JSON.stringify(recipients)]);
    return recipients;
}
async function addSmsRecipient(phone) {
    const current = await getSmsRecipients();
    const next = dedupePhones([...current, phone]);
    return setSmsRecipients(next);
}
async function removeSmsRecipient(phone) {
    const target = normalizePhone(phone);
    const current = await getSmsRecipients();
    const next = current.filter((value) => normalizePhone(value) !== target);
    return setSmsRecipients(next);
}
//# sourceMappingURL=sms-recipients.repository.js.map