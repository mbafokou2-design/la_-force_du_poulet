export type SmsErrorKind = "authentication" | "invalid_credentials" | "insufficient_units" | "invalid_number" | "rate_limit" | "timeout" | "network" | "http_4xx" | "http_5xx" | "config" | "unknown";
export interface SmsResult {
    success: boolean;
    errorMessage?: string;
    errorKind?: SmsErrorKind;
    messageId?: string;
    attemptCount?: number;
    requestStartedAt?: string;
    requestCompletedAt?: string;
    requestDurationMs?: number;
    acceptedAt?: string;
    orangeResourceId?: string | null;
    orangeRequestId?: string | null;
    httpStatus?: number;
}
export interface OrangeSmsConfig {
    authorization: string;
    clientId: string;
    clientSecret: string;
    senderAddress: string;
    timeoutMs?: number;
    maxRetries?: number;
}
type FetchLike = typeof fetch;
export declare class OrangeSmsError extends Error {
    readonly kind: SmsErrorKind;
    readonly status?: number;
    readonly retryable: boolean;
    attemptCount?: number;
    requestDurationMs?: number;
    requestStartedAt?: string;
    requestCompletedAt?: string;
    orangeResourceId?: string | null;
    orangeRequestId?: string | null;
    constructor(kind: SmsErrorKind, message: string, options?: {
        status?: number;
        retryable?: boolean;
    });
}
export declare function maskPhoneNumber(phone: string): string;
export declare function toOrangeAddress(phone: string): string;
export declare function redactSecrets(value: string): string;
export declare function validateOrangeSmsConfig(config: OrangeSmsConfig): void;
export declare class OrangeSmsService {
    private readonly config;
    private readonly fetchImpl;
    private accessToken;
    private tokenExpiresAt;
    private readonly timeoutMs;
    private readonly maxRetries;
    constructor(config: OrangeSmsConfig, fetchImpl?: FetchLike);
    invalidateToken(): void;
    private hasValidAccessToken;
    getAccessToken(): Promise<string>;
    sendSms(phone: string, message: string): Promise<SmsResult>;
    sendOrderSms(tableNumber: string, message: string): Promise<SmsResult>;
    private sendSmsWithRetry;
    private request;
}
export declare function getOrangeSmsService(): OrangeSmsService;
export declare function sendOrderSms(tableNumber: string, message: string): Promise<SmsResult>;
export declare function resetOrangeSmsServiceForTests(): void;
export {};
//# sourceMappingURL=orange-sms.service.d.ts.map