"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchOrderSms = dispatchOrderSms;
const logger_1 = require("../utils/logger");
const orange_sms_service_1 = require("./orange-sms.service");
const sms_notifications_repository_1 = require("../repositories/sms-notifications.repository");
const CONTEXT = "SMS";
function staffPhoneNumbers() {
    return (process.env.STAFF_PHONE_NUMBERS || "")
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
}
function toStatus(result) {
    if (result.success)
        return "ACCEPTED";
    if (result.errorKind === "timeout" || result.errorKind === "network" || result.errorKind === "http_5xx" || result.errorKind === "rate_limit") {
        return "UNKNOWN";
    }
    return "FAILED";
}
async function dispatchOrderSms(input, service = new orange_sms_service_1.OrangeSmsService({
    authorization: process.env.ORANGE_AUTHORIZATION || "",
    clientId: process.env.ORANGE_CLIENT_ID || "",
    clientSecret: process.env.ORANGE_CLIENT_SECRET || "",
    senderAddress: process.env.ORANGE_SENDER_ADDRESS || "",
})) {
    logger_1.logger.info(CONTEXT, `notification requested (order #${input.orderId}, table ${input.tableNumber})`);
    const recipients = staffPhoneNumbers();
    if (recipients.length === 0) {
        return {
            success: false,
            errorKind: "config",
            errorMessage: "No staff phone numbers configured (STAFF_PHONE_NUMBERS).",
            recipients: [],
        };
    }
    const perRecipient = [];
    for (const phone of recipients) {
        const requestedAt = new Date();
        const notification = await (0, sms_notifications_repository_1.createSmsNotification)({
            orderId: input.orderId,
            recipientPhone: phone,
            message: input.message,
            provider: "ORANGE",
            requestedAt,
            retryCount: 0,
        });
        const result = await service.sendSms(phone, input.message);
        perRecipient.push({ phone, notificationId: notification.id, result });
        const retryCount = Math.max(0, (result.attemptCount ?? 1) - 1);
        const status = toStatus(result);
        const orangeResourceId = result.orangeResourceId ?? result.messageId ?? null;
        const orangeRequestId = result.orangeRequestId ?? null;
        if (orangeResourceId) {
            await (0, sms_notifications_repository_1.attachOrangeResourceId)(notification.id, orangeResourceId, orangeRequestId);
        }
        await (0, sms_notifications_repository_1.updateSmsNotificationById)(notification.id, {
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
//# sourceMappingURL=sms-dispatch.service.js.map