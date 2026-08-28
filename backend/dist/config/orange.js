"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrangeSmsDeliveryCallbackUrl = getOrangeSmsDeliveryCallbackUrl;
const public_url_1 = require("../utils/public-url");
function getOrangeSmsDeliveryCallbackUrl() {
    return (process.env.ORANGE_SMS_DR_CALLBACK_URL ||
        process.env.ORANGE_SMS_CALLBACK_URL ||
        `${(0, public_url_1.getConfiguredPublicBaseUrl)()}/api/webhooks/orange/sms-dr`);
}
//# sourceMappingURL=orange.js.map