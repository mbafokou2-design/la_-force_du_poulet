"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskPhoneNumber = maskPhoneNumber;
exports.normalizeOrangeAddress = normalizeOrangeAddress;
exports.normalizeOrangeResourceId = normalizeOrangeResourceId;
exports.extractOrangeDeliveryCallbackData = extractOrangeDeliveryCallbackData;
exports.mapOrangeDeliveryStatus = mapOrangeDeliveryStatus;
exports.isStaticAssetPath = isStaticAssetPath;
function maskPhoneNumber(phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4)
        return "***";
    const visible = digits.slice(-4);
    const prefix = phone.trim().startsWith("+") ? "+" : "";
    const country = digits.length > 9 ? digits.slice(0, digits.length - 9) : "";
    return `${prefix}${country}******${visible}`;
}
function normalizeOrangeAddress(phone) {
    let digits = phone.replace(/\D/g, "");
    if (digits.startsWith("00")) {
        digits = digits.slice(2);
    }
    if (digits.startsWith("237")) {
        return `tel:+${digits}`;
    }
    if (digits.startsWith("0") && digits.length === 10) {
        return `tel:+237${digits.slice(1)}`;
    }
    if (digits.length === 9) {
        return `tel:+237${digits}`;
    }
    return `tel:+${digits}`;
}
function normalizeOrangeResourceId(value) {
    if (!value)
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    try {
        const url = new URL(trimmed);
        const parts = url.pathname.split("/").filter(Boolean);
        const candidate = parts[parts.length - 1];
        return candidate || trimmed;
    }
    catch {
        const parts = trimmed.split("/").filter(Boolean);
        return parts[parts.length - 1] || trimmed;
    }
}
function extractOrangeDeliveryCallbackData(payload) {
    if (!payload || typeof payload !== "object")
        return null;
    const root = payload;
    const notification = root.deliveryInfoNotification ||
        root.deliveryReceiptNotification ||
        root.smsDeliveryReceipt ||
        null;
    const info = notification?.deliveryInfo;
    const callbackData = notification?.callbackData ?? root.callbackData ?? root.resource_id;
    const deliveryStatus = info?.deliveryStatus ?? root.deliveryStatus ?? root.status;
    const address = info?.address ?? root.address ?? root.recipientAddress;
    return {
        callbackData: typeof callbackData === "string" ? callbackData : null,
        deliveryStatus: typeof deliveryStatus === "string" ? deliveryStatus : null,
        recipientPhone: typeof address === "string" ? address.replace(/^tel:/i, "") : null,
        rawAddress: typeof address === "string" ? address : null,
    };
}
function mapOrangeDeliveryStatus(status) {
    switch (status) {
        case "DeliveredToTerminal":
            return "DELIVERED";
        case "DeliveredToNetwork":
            return "DELIVERED_TO_NETWORK";
        case "MessageWaiting":
            return "PENDING";
        case "DeliveryImpossible":
            return "FAILED";
        case "DeliveryUncertain":
            return "UNKNOWN";
        default:
            return "UNKNOWN";
    }
}
function isStaticAssetPath(urlPath) {
    const path = urlPath.split("?")[0].toLowerCase();
    if (path === "/favicon.ico")
        return true;
    if (path.startsWith("/assets/"))
        return true;
    if (path.startsWith("/qrcodes/"))
        return true;
    return /\.(css|js|map|png|jpg|jpeg|webp|gif|svg|ico)$/.test(path);
}
//# sourceMappingURL=sms.js.map