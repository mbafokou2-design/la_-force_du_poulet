import { logger } from "../utils/logger";
import { OrangeSmsService, type SmsResult } from "./orange-sms.service";
import {
  attachOrangeResourceId,
  createSmsNotification,
  updateSmsNotificationById,
} from "../repositories/sms-notifications.repository";
import { getSmsRecipients } from "../repositories/sms-recipients.repository";
import { maskPhoneNumber } from "../utils/sms";

const CONTEXT = "SMS";

function toStatus(result: SmsResult): "ACCEPTED" | "FAILED" | "UNKNOWN" {
  if (result.success) return "ACCEPTED";
  if (result.errorKind === "timeout" || result.errorKind === "network" || result.errorKind === "http_5xx" || result.errorKind === "rate_limit") {
    return "UNKNOWN";
  }
  return "FAILED";
}

export type DispatchOrderSmsInput = {
  orderId: number | null;
  tableNumber: string;
  message: string;
};

export type DispatchOrderSmsResult = SmsResult & {
  recipients?: Array<{
    phone: string;
    notificationId: number;
    result: SmsResult;
  }>;
};

export async function dispatchOrderSms(
  input: DispatchOrderSmsInput,
  service = new OrangeSmsService({
    authorization: process.env.ORANGE_AUTHORIZATION || "",
    clientId: process.env.ORANGE_CLIENT_ID || "",
    clientSecret: process.env.ORANGE_CLIENT_SECRET || "",
    senderAddress: process.env.ORANGE_SMS_SENDER || "",
  })
): Promise<DispatchOrderSmsResult> {
  logger.info(CONTEXT, `notification requested (order #${input.orderId}, table ${input.tableNumber})`);

  const recipients = await getSmsRecipients();
  if (recipients.length === 0) {
    return {
      success: false,
      errorKind: "config",
      errorMessage: "No staff phone numbers configured.",
      recipients: [],
    };
  }

  const perRecipient: Array<{ phone: string; notificationId: number; result: SmsResult }> = [];

  for (const phone of recipients) {
    const requestedAt = new Date();
    logger.info(CONTEXT, "SMS recipient prepare", {
      orderId: input.orderId,
      tableNumber: input.tableNumber,
      recipientMasked: maskPhoneNumber(phone),
      requestedAt: requestedAt.toISOString(),
    });
    const notification = await createSmsNotification({
      orderId: input.orderId,
      recipientPhone: phone,
      message: input.message,
      provider: "ORANGE",
      requestedAt,
      retryCount: 0,
    });

    const result = await service.sendSms(phone, input.message);
    logger.info(CONTEXT, "SMS recipient result", {
      orderId: input.orderId,
      notificationId: notification.id,
      recipientMasked: maskPhoneNumber(phone),
      success: result.success,
      errorKind: result.errorKind || null,
      errorMessage: result.errorMessage || null,
      attemptCount: result.attemptCount ?? 0,
      httpStatus: result.httpStatus ?? null,
      orangeResourceId: result.orangeResourceId ?? null,
      orangeRequestId: result.orangeRequestId ?? null,
      acceptedAt: result.acceptedAt || null,
      requestCompletedAt: result.requestCompletedAt || null,
      requestDurationMs: result.requestDurationMs ?? null,
    });
    perRecipient.push({ phone, notificationId: notification.id, result });

    const retryCount = Math.max(0, (result.attemptCount ?? 1) - 1);
    const status = toStatus(result);
    const orangeResourceId = result.orangeResourceId ?? result.messageId ?? null;
    const orangeRequestId = result.orangeRequestId ?? null;

    if (orangeResourceId) {
      await attachOrangeResourceId(notification.id, orangeResourceId, orangeRequestId);
      logger.info(CONTEXT, "SMS orange resource attached", {
        orderId: input.orderId,
        notificationId: notification.id,
        orangeResourceId,
        orangeRequestId,
      });
    }

    await updateSmsNotificationById(notification.id, {
      status,
      orangeResourceId,
      orangeRequestId,
      orangeDeliveryStatus: null,
      acceptedAt: result.acceptedAt ? new Date(result.acceptedAt) : null,
      sentAt: result.acceptedAt ? new Date(result.acceptedAt) : null,
      failedAt: result.success ? null : new Date(),
      callbackReceivedAt: null,
      errorCode: result.errorKind || null,
      errorMessage: result.errorMessage || null,
      retryCount,
      lastAttemptAt: result.requestCompletedAt ? new Date(result.requestCompletedAt) : new Date(),
      requestDurationMs: result.requestDurationMs ?? null,
      deliveryLatencyMs: null,
      totalLatencyMs: null,
    });

    logger.info(CONTEXT, "SMS notification row updated", {
      orderId: input.orderId,
      notificationId: notification.id,
      status,
      retryCount,
    });
  }

  const failed = perRecipient.filter((row) => !row.result.success);
  const firstSuccess = perRecipient.find((row) => row.result.success);

  if (failed.length > 0) {
    return {
      success: false,
      errorKind: failed[0].result.errorKind || "unknown",
      errorMessage: failed.map((row) => row.result.errorMessage).filter(Boolean).join(" | "),
      messageId: firstSuccess?.result.messageId || undefined,
      recipients: perRecipient,
    };
  }

  return {
    success: true,
    messageId: perRecipient.map((row) => row.result.messageId).filter(Boolean).join(","),
    recipients: perRecipient,
  };
}
