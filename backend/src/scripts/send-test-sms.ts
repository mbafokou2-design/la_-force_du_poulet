/**
 * Real SMS test via Orange Cameroon All Operators.
 * Usage from backend/:
 *   npm run sms:send-test
 *   npm run sms:send-test -- +2376XXXXXXXX
 */
import dotenv from "dotenv";
dotenv.config();

import {
  OrangeSmsService,
  maskPhoneNumber,
  toOrangeAddress,
  validateOrangeSmsConfig,
} from "../services/orange-sms.service";

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
    senderAddress: process.env.ORANGE_SMS_SENDER || "",
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

  const senderAddress = process.env.ORANGE_SMS_SENDER || "";
  const recipientAddress = toOrangeAddress(recipient);
  let service: OrangeSmsService;

  try {
    service = buildService();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log("SMS test started");
  console.log(`  senderAddress: ${senderAddress}`);
  console.log(`  recipientInput: ${recipient}`);
  console.log(`  recipientAddress: ${recipientAddress}`);
  console.log(`  recipientMasked: ${maskPhoneNumber(recipient)}`);
  console.log("  message: La Force du Poulet - Orange test SMS.");

  const result = await service.sendSms(recipient, "La Force du Poulet - Orange test SMS.");

  if (!result.success) {
    console.error("SMS test result: FAILED");
    console.error(`  errorKind: ${result.errorKind || "unknown"}`);
    console.error(`  httpStatus: ${result.httpStatus ?? "n/a"}`);
    console.error(`  errorMessage: ${result.errorMessage || "unknown error"}`);
    console.error(`  attemptCount: ${result.attemptCount ?? 0}`);
    console.error(`  requestStartedAt: ${result.requestStartedAt || "n/a"}`);
    console.error(`  requestCompletedAt: ${result.requestCompletedAt || "n/a"}`);
    console.error(`  requestDurationMs: ${result.requestDurationMs ?? "n/a"}`);
    process.exit(1);
  }

  console.log("SMS test result: OK");
  console.log(`  httpStatus: ${result.httpStatus ?? "n/a"}`);
  console.log(`  messageId: ${result.messageId || "n/a"}`);
  console.log(`  orangeResourceId: ${result.orangeResourceId || "n/a"}`);
  console.log(`  orangeRequestId: ${result.orangeRequestId || "n/a"}`);
  console.log(`  attemptCount: ${result.attemptCount ?? 0}`);
  console.log(`  requestStartedAt: ${result.requestStartedAt || "n/a"}`);
  console.log(`  requestCompletedAt: ${result.requestCompletedAt || "n/a"}`);
  console.log(`  requestDurationMs: ${result.requestDurationMs ?? "n/a"}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
