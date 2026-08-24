/**
 * Real SMS test via Orange Cameroon All Operators.
 * Usage from backend/:
 *   npm run sms:send-test
 *   npm run sms:send-test -- +2376XXXXXXXX
 */
import dotenv from "dotenv";
dotenv.config();

import { OrangeSmsService, maskPhoneNumber, validateOrangeSmsConfig } from "../services/orange-sms.service";

function pickRecipient(): string | null {
  const argPhone = process.argv[2]?.trim();
  if (argPhone) return argPhone;

  const fromEnv = (process.env.STAFF_PHONE_NUMBERS || "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean)[0];

  return fromEnv || null;
}

function buildService(): OrangeSmsService {
  const config = {
    authorization: process.env.ORANGE_AUTHORIZATION || "",
    clientId: process.env.ORANGE_CLIENT_ID || "",
    clientSecret: process.env.ORANGE_CLIENT_SECRET || "",
    senderAddress: process.env.ORANGE_SENDER_ADDRESS || "",
  };

  validateOrangeSmsConfig(config);
  return new OrangeSmsService(config);
}

async function main() {
  const recipient = pickRecipient();
  if (!recipient) {
    console.error("No recipient number: pass an argument or set STAFF_PHONE_NUMBERS.");
    process.exit(1);
  }

  const senderAddress = process.env.ORANGE_SENDER_ADDRESS || "";
  let service: OrangeSmsService;

  try {
    service = buildService();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log(`SMS test recipient: ${maskPhoneNumber(recipient)}`);
  console.log(`SMS test sender: ${senderAddress}`);
  console.log("SMS test message: La Force du Poulet - Orange test SMS.");

  const result = await service.sendSms(recipient, "La Force du Poulet - Orange test SMS.");

  if (!result.success) {
    console.error("FAILED");
    console.error(`  kind: ${result.errorKind || "unknown"}`);
    console.error(`  http: ${result.httpStatus ?? "n/a"}`);
    console.error(`  message: ${result.errorMessage || "unknown error"}`);
    console.error(`  attempts: ${result.attemptCount ?? 0}`);
    process.exit(1);
  }

  console.log("OK");
  console.log(`  http: ${result.httpStatus ?? "n/a"}`);
  console.log(`  messageId: ${result.messageId || "n/a"}`);
  console.log(`  attempts: ${result.attemptCount ?? 0}`);
  console.log(`  requestDurationMs: ${result.requestDurationMs ?? "n/a"}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
