"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrangeSmsDeliveryCallbackUrl = getOrangeSmsDeliveryCallbackUrl;
function getOrangeSmsDeliveryCallbackUrl() {
    return (process.env.ORANGE_SMS_DR_CALLBACK_URL ||
        process.env.ORANGE_SMS_CALLBACK_URL ||
        `${process.env.PUBLIC_BASE_URL || "http://localhost:4000"}/api/webhooks/orange/sms-dr`);
}
//# sourceMappingURL=orange.js.map