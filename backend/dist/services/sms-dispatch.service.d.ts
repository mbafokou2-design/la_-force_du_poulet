import { OrangeSmsService, type SmsResult } from "./orange-sms.service";
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
export declare function dispatchOrderSms(input: DispatchOrderSmsInput, service?: OrangeSmsService): Promise<DispatchOrderSmsResult>;
//# sourceMappingURL=sms-dispatch.service.d.ts.map