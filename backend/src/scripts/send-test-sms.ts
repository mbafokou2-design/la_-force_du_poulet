/**
 * Envoi d'un SMS réel via Orange Cameroon All Operators.
 * Usage (depuis backend/, avec bundle Orange actif) :
 *   npm run sms:send-test
 *   npm run sms:send-test -- +2376XXXXXXXX
 */
import dotenv from "dotenv";
dotenv.config();

import { OrangeSmsService, maskPhoneNumber } from "../services/orange-sms.service";

async function main() {
  const argPhone = process.argv[2];
  const fromEnv = (process.env.STAFF_PHONE_NUMBERS || "").split(",")[0]?.trim();
  const phone = argPhone || fromEnv;

  if (!phone) {
    console.error("Aucun numéro : passez un argument ou définissez STAFF_PHONE_NUMBERS.");
    process.exit(1);
  }

  const service = new OrangeSmsService({
    authorization: process.env.ORANGE_AUTHORIZATION || "",
    clientId: process.env.ORANGE_CLIENT_ID || "",
    clientSecret: process.env.ORANGE_CLIENT_SECRET || "",
  });

  console.log(`Envoi SMS de test vers ${maskPhoneNumber(phone)}…`);
  const result = await service.sendSms(phone, "La Force du Poulet — SMS de test Orange.");

  if (!result.success) {
    console.error("Échec:", result.errorKind, result.errorMessage);
    process.exit(1);
  }

  console.log("OK", result.messageId || "");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
