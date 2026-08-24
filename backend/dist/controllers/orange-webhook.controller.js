"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOrangeSmsDeliveryReceipt = processOrangeSmsDeliveryReceipt;
exports.handleOrangeSmsDeliveryReceipt = handleOrangeSmsDeliveryReceipt;
const logger_1 = require("../utils/logger");
const sms_notifications_repository_1 = require("../repositories/sms-notifications.repository");
const sms_1 = require("../utils/sms");
const CONTEXT = "SMS";
async function processOrangeSmsDeliveryReceipt(body, deps = {}) {
    const receivedAt = deps.now ? deps.now() : new Date();
    const parsed = (0, sms_1.extractOrangeDeliveryCallbackData)(body);
    if (!parsed || !parsed.callbackData || !parsed.deliveryStatus) {
        logger_1.logger.warn(CONTEXT, "callback invalid");
        return { ok: true, processed: false, reason: "invalid" };
    }
    const orangeResourceId = parsed.callbackData.trim();
    const deliveryStatus = parsed.deliveryStatus.trim();
    const internalStatus = (0, sms_1.mapOrangeDeliveryStatus)(deliveryStatus);
    const phoneMasked = parsed.recipientPhone ? (0, sms_1.maskPhoneNumber)(parsed.recipientPhone) : "unknown";
    logger_1.logger.info(CONTEXT, `delivery callback received for ${orangeResourceId} (${phoneMasked})`);
    logger_1.logger.info(CONTEXT, deliveryStatus);
    const findByOrangeResourceId = deps.findByOrangeResourceId ?? sms_notifications_repository_1.findSmsNotificationByOrangeResourceId;
    const updateByOrangeResourceId = deps.updateByOrangeResourceId ?? sms_notifications_repository_1.updateSmsNotificationByOrangeResourceId;
    const existing = await findByOrangeResourceId(orangeResourceId);
    if (!existing) {
        logger_1.logger.warn(CONTEXT, `callback unknown resource ID ${orangeResourceId}`);
        return { ok: true, processed: false, reason: "unknown_resource_id" };
    }
    const acceptedAt = existing.accepted_at ? new Date(existing.accepted_at) : null;
    const requestedAt = existing.requested_at ? new Date(existing.requested_at) : null;
    const deliveredAt = internalStatus === "DELIVERED" ? receivedAt : existing.delivered_at ? new Date(existing.delivered_at) : null;
    const failedAt = internalStatus === "FAILED" ? receivedAt : existing.failed_at ? new Date(existing.failed_at) : null;
    const deliveryLatencyMs = deliveredAt && acceptedAt ? Math.max(0, deliveredAt.getTime() - acceptedAt.getTime()) : existing.delivery_latency_ms;
    const totalLatencyMs = deliveredAt && requestedAt ? Math.max(0, deliveredAt.getTime() - requestedAt.getTime()) : existing.total_latency_ms;
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
        logger_1.logger.info(CONTEXT, `delivery latency = ${deliveryLatencyMs} ms`);
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
async function handleOrangeSmsDeliveryReceipt(req, res) {
    const result = await processOrangeSmsDeliveryReceipt(req.body);
    return res.status(200).json(result);
}
//# sourceMappingURL=orange-webhook.controller.js.map