export type OrangeDeliveryStatus = "DeliveredToTerminal" | "DeliveredToNetwork" | "MessageWaiting" | "DeliveryImpossible" | "DeliveryUncertain";
export type SmsInternalStatus = "PENDING" | "ACCEPTED" | "DELIVERED" | "DELIVERED_TO_NETWORK" | "FAILED" | "UNKNOWN";
export declare function maskPhoneNumber(phone: string): string;
export declare function normalizeOrangeAddress(phone: string): string;
export declare function normalizeOrangeResourceId(value: string | null | undefined): string | null;
export declare function extractOrangeDeliveryCallbackData(payload: unknown): {
    callbackData: string | null;
    deliveryStatus: string | null;
    recipientPhone: string | null;
    rawAddress: string | null;
} | null;
export declare function mapOrangeDeliveryStatus(status: string | null | undefined): SmsInternalStatus;
export declare function isStaticAssetPath(urlPath: string): boolean;
//# sourceMappingURL=sms.d.ts.map