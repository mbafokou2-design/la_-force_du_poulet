export type SmsErrorKind = "authentication" | "invalid_credentials" | "insufficient_units" | "invalid_number" | "rate_limit" | "timeout" | "network" | "http_4xx" | "http_5xx" | "config" | "unknown";
export interface SmsResult {
    success: boolean;
    errorMessage?: string;
    errorKind?: SmsErrorKind;
    messageId?: string;
}
export interface OrangeSmsConfig {
    authorization: string;
    clientId: string;
    clientSecret: string;
    timeoutMs?: number;
    maxRetries?: number;
}
type FetchLike = typeof fetch;
export declare class OrangeSmsError extends Error {
    readonly kind: SmsErrorKind;
    readonly status?: number;
    readonly retryable: boolean;
    constructor(kind: SmsErrorKind, message: string, options?: {
        status?: number;
        retryable?: boolean;
    });
}
export declare function maskPhoneNumber(phone: string): string;
/** Normalise un numéro camerounais vers le format Orange `tel:+237XXXXXXXXX`. */
export declare function toOrangeAddress(phone: string): string;
export declare function redactSecrets(value: string): string;
export declare class OrangeSmsService {
    private readonly config;
    private readonly fetchImpl;
    private accessToken;
    private tokenExpiresAt;
    private readonly timeoutMs;
    private readonly maxRetries;
    constructor(config: OrangeSmsConfig, fetchImpl?: FetchLike);
    invalidateToken(): void;
    getAccessToken(): Promise<string>;
    sendSms(phone: string, message: string): Promise<SmsResult>;
    /**
     * Envoie le récapitulatif de commande à tous les numéros du staff.
     * Ne jette jamais : success:false si l'envoi échoue.
     */
    sendOrderSms(tableNumber: string, message: string): Promise<SmsResult>;
    private sendSmsWithRetry;
    private request;
}
export declare function getOrangeSmsService(): OrangeSmsService;
/** Point d'entrée compatible avec le contrôleur de commandes existant. */
export declare function sendOrderSms(tableNumber: string, message: string): Promise<SmsResult>;
export declare function resetOrangeSmsServiceForTests(): void;
export {};
//# sourceMappingURL=orange-sms.service.d.ts.map