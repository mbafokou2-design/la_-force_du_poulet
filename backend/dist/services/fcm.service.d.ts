export type PushResult = {
    enabled: boolean;
    attempted: number;
    sent: number;
    failed: number;
};
export declare function dispatchOrderPush(input: {
    orderId: number;
    tableNumber: string;
    message: string;
}): Promise<PushResult>;
//# sourceMappingURL=fcm.service.d.ts.map