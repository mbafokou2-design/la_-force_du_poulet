import { Request, Response } from "express";
import { logger } from "../utils/logger";
import {
  findSmsNotificationByOrangeResourceId,
  updateSmsNotificationByOrangeResourceId,
} from "../repositories/sms-notifications.repository";
import {
  extractOrangeDeliveryCallbackData,
  mapOrangeDeliveryStatus,
  maskPhoneNumber,
} from "../utils/sms";

const CONTEXT = "SMS";

type ReceiptDeps = {
  findByOrangeResourceId?: typeof findSmsNotificationByOrangeResourceId;
  updateByOrangeResourceId?: typeof updateSmsNotificationByOrangeResourceId;
  now?: () => Date;
};

export async function processOrangeSmsDeliveryReceipt(body: unknown, deps: ReceiptDeps = {}) {
  const receivedAt = deps.now ? deps.now() : new Date();
  const parsed = extractOrangeDeliveryCallbackData(body);

  if (!parsed || !parsed.callbackData || !parsed.deliveryStatus) {
    logger.warn(CONTEXT, "callback invalid");
    return { ok: true, processed: false, reason: "invalid" };
  }

  const orangeResourceId = parsed.callbackData.trim();
  const deliveryStatus = parsed.deliveryStatus.trim();
  const internalStatus = mapOrangeDeliveryStatus(deliveryStatus);
  const phoneMasked = parsed.recipientPhone ? maskPhoneNumber(parsed.recipientPhone) : "unknown";

  logger.info(CONTEXT, `delivery callback received for ${orangeResourceId} (${phoneMasked})`);
  logger.info(CONTEXT, deliveryStatus);

  const findByOrangeResourceId = deps.findByOrangeResourceId ?? findSmsNotificationByOrangeResourceId;
  const updateByOrangeResourceId = deps.updateByOrangeResourceId ?? updateSmsNotificationByOrangeResourceId;
  const existing = await findByOrangeResourceId(orangeResourceId);
  if (!existing) {
    logger.warn(CONTEXT, `callback unknown resource ID ${orangeResourceId}`);
    return { ok: true, processed: false, reason: "unknown_resource_id" };
  }

  const acceptedAt = existing.accepted_at ? new Date(existing.accepted_at) : null;
  const requestedAt = existing.requested_at ? new Date(existing.requested_at) : null;

  const deliveredAt =
    internalStatus === "DELIVERED" ? receivedAt : existing.delivered_at ? new Date(existing.delivered_at) : null;
  const failedAt =
    internalStatus === "FAILED" ? receivedAt : existing.failed_at ? new Date(existing.failed_at) : null;

  const deliveryLatencyMs =
    deliveredAt && acceptedAt ? Math.max(0, deliveredAt.getTime() - acceptedAt.getTime()) : existing.delivery_latency_ms;
  const totalLatencyMs =
    deliveredAt && requestedAt ? Math.max(0, deliveredAt.getTime() - requestedAt.getTime()) : existing.total_latency_ms;

  await updateByOrangeResourceId(orangeResourceId, {
    status: internalStatus,
    orangeDeliveryStatus: deliveryStatus,
    deliveredAt,
    failedAt,
    callbackReceivedAt: receivedAt,
    deliveryLatencyMs,
    totalLatencyMs,
    errorMessage: internalStatus === "FAILED" ? existing.error_message : existing.error_message,
    errorCode: existing.error_code,
  });

  if (deliveryLatencyMs !== null && deliveryLatencyMs !== undefined) {
    logger.info(CONTEXT, `delivery latency = ${deliveryLatencyMs} ms`);
  }

  return {
    ok: true,
    processed: true,
    resourceId: orangeResourceId,
    status: internalStatus,
    orangeDeliveryStatus: deliveryStatus,
    deliveryLatencyMs,
    totalLatencyMs,
  };
}

export async function handleOrangeSmsDeliveryReceipt(req: Request, res: Response) {
  const result = await processOrangeSmsDeliveryReceipt(req.body);
  return res.status(200).json(result);
}
