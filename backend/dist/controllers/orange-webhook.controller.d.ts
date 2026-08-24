import { Request, Response } from "express";
import { findSmsNotificationByOrangeResourceId, updateSmsNotificationByOrangeResourceId } from "../repositories/sms-notifications.repository";
type ReceiptDeps = {
    findByOrangeResourceId?: typeof findSmsNotificationByOrangeResourceId;
    updateByOrangeResourceId?: typeof updateSmsNotificationByOrangeResourceId;
    now?: () => Date;
};
export declare function processOrangeSmsDeliveryReceipt(body: unknown, deps?: ReceiptDeps): Promise<{
    ok: boolean;
    processed: boolean;
    reason: string;
    resourceId?: undefined;
    status?: undefined;
    orangeDeliveryStatus?: undefined;
    deliveryLatencyMs?: undefined;
    totalLatencyMs?: undefined;
} | {
    reason?: undefined;
    ok: boolean;
    processed: boolean;
    resourceId: string;
    status: import("../utils/sms").SmsInternalStatus;
    orangeDeliveryStatus: string;
    deliveryLatencyMs: number | null;
    totalLatencyMs: number | null;
}>;
export declare function handleOrangeSmsDeliveryReceipt(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export {};
//# sourceMappingURL=orange-webhook.controller.d.ts.map