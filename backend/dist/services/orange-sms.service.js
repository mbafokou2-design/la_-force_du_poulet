"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrangeSmsService = exports.OrangeSmsError = void 0;
exports.maskPhoneNumber = maskPhoneNumber;
exports.toOrangeAddress = toOrangeAddress;
exports.redactSecrets = redactSecrets;
exports.validateOrangeSmsConfig = validateOrangeSmsConfig;
exports.getOrangeSmsService = getOrangeSmsService;
exports.sendOrderSms = sendOrderSms;
exports.resetOrangeSmsServiceForTests = resetOrangeSmsServiceForTests;
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("../utils/logger");
const sms_1 = require("../utils/sms");
dotenv_1.default.config();
const CONTEXT = "SMS";
const ORANGE_TOKEN_URL = "https://api.orange.com/oauth/v3/token";
const TOKEN_REFRESH_MARGIN_MS = 60000;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;
class OrangeSmsError extends Error {
    constructor(kind, message, options) {
        super(message);
        this.name = "OrangeSmsError";
        this.kind = kind;
        this.status = options?.status;
        this.retryable = options?.retryable ?? false;
    }
}
exports.OrangeSmsError = OrangeSmsError;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function buildOrangeSmsUrl(senderAddress) {
    return `https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent(senderAddress)}/requests`;
}
function maskPhoneNumber(phone) {
    return (0, sms_1.maskPhoneNumber)(phone);
}
function toOrangeAddress(phone) {
    return (0, sms_1.normalizeOrangeAddress)(phone);
}
function redactSecrets(value) {
    return value
        .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
        .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, "Basic [REDACTED]")
        .replace(/("access_token"\s*:\s*")[^"]+/gi, '$1[REDACTED]')
        .replace(/(client_secret|ORANGE_CLIENT_SECRET|ORANGE_AUTHORIZATION)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
}
function bodyIndicatesInsufficientUnits(body) {
    const text = body.toLowerCase();
    return (text.includes("insufficient") ||
        text.includes("no units") ||
        text.includes("no credit") ||
        text.includes("not enough") ||
        text.includes("balance") ||
        text.includes("quota") ||
        text.includes("bundle") ||
        text.includes("out of credit"));
}
function bodyIndicatesInvalidNumber(body) {
    const text = body.toLowerCase();
    return (text.includes("invalid number") ||
        text.includes("invalid address") ||
        text.includes("invalid msisdn") ||
        text.includes("unknown subscriber") ||
        (text.includes("malformed") && text.includes("address")));
}
function classifyHttpError(status, body) {
    const sanitized = redactSecrets(body).slice(0, 500);
    if (bodyIndicatesInsufficientUnits(body) || status === 402) {
        return {
            kind: "insufficient_units",
            retryable: false,
            message: "Orange SMS: insufficient units. Purchase an SMS bundle in Orange Developer.",
        };
    }
    if (status === 401) {
        return {
            kind: "invalid_credentials",
            retryable: false,
            message: `invalid credentials (HTTP 401): ${sanitized}`,
        };
    }
    if (status === 403) {
        return {
            kind: "authentication",
            retryable: false,
            message: `authentication failed (HTTP 403): ${sanitized}`,
        };
    }
    if (status === 429) {
        return {
            kind: "rate_limit",
            retryable: true,
            message: `rate limit (HTTP 429): ${sanitized}`,
        };
    }
    if (bodyIndicatesInvalidNumber(body)) {
        return {
            kind: "invalid_number",
            retryable: false,
            message: `invalid recipient (HTTP ${status}): ${sanitized}`,
        };
    }
    if (status >= 500) {
        return {
            kind: "http_5xx",
            retryable: true,
            message: `Orange 5xx (HTTP ${status}): ${sanitized}`,
        };
    }
    if (status >= 400) {
        return {
            kind: "http_4xx",
            retryable: false,
            message: `Orange 4xx (HTTP ${status}): ${sanitized}`,
        };
    }
    return {
        kind: "unknown",
        retryable: false,
        message: `Orange HTTP ${status}: ${sanitized}`,
    };
}
function classifyFetchFailure(err) {
    const name = err instanceof Error ? err.name : "";
    const message = err instanceof Error ? err.message : String(err);
    const code = err?.code || "";
    if (name === "AbortError" || message.toLowerCase().includes("timeout") || code === "ABORT_ERR") {
        return { kind: "timeout", retryable: true, message: `timeout: ${message}` };
    }
    if (name === "TypeError" ||
        code === "ECONNRESET" ||
        code === "ENOTFOUND" ||
        code === "ECONNREFUSED" ||
        code === "ETIMEDOUT" ||
        message.toLowerCase().includes("fetch") ||
        message.toLowerCase().includes("network")) {
        return { kind: "network", retryable: true, message: `network error: ${message}` };
    }
    return { kind: "unknown", retryable: false, message: `unknown error: ${message}` };
}
function extractMessageId(payload, headers) {
    const headerId = headers.get("x-orange-ismg") || headers.get("x-request-id") || headers.get("location");
    if (headerId)
        return (0, sms_1.normalizeOrangeResourceId)(headerId) || headerId;
    if (!payload || typeof payload !== "object")
        return undefined;
    const request = payload.outboundSMSMessageRequest;
    if (!request)
        return undefined;
    const resourceURL = request.resourceURL;
    if (typeof resourceURL === "string" && resourceURL.length > 0) {
        return (0, sms_1.normalizeOrangeResourceId)(resourceURL) || resourceURL;
    }
    const requestId = request.requestId ?? request.resourceId;
    if (typeof requestId === "string")
        return (0, sms_1.normalizeOrangeResourceId)(requestId) || requestId;
    return undefined;
}
function logKind(kind, message) {
    logger_1.logger.error(CONTEXT, message);
    switch (kind) {
        case "authentication":
            logger_1.logger.error(CONTEXT, "authentication failed");
            break;
        case "invalid_credentials":
            logger_1.logger.error(CONTEXT, "invalid credentials");
            break;
        case "insufficient_units":
            logger_1.logger.error(CONTEXT, "insufficient units / bundle required");
            break;
        case "invalid_number":
            logger_1.logger.error(CONTEXT, "invalid recipient");
            break;
        case "rate_limit":
            logger_1.logger.error(CONTEXT, "rate limit");
            break;
        case "timeout":
            logger_1.logger.error(CONTEXT, "timeout");
            break;
        case "network":
            logger_1.logger.error(CONTEXT, "network error");
            break;
        case "http_4xx":
            logger_1.logger.error(CONTEXT, "Orange 4xx");
            break;
        case "http_5xx":
            logger_1.logger.error(CONTEXT, "Orange 5xx");
            break;
        default:
            break;
    }
}
function loadConfigFromEnv() {
    return {
        authorization: process.env.ORANGE_AUTHORIZATION || "",
        clientId: process.env.ORANGE_CLIENT_ID || "",
        clientSecret: process.env.ORANGE_CLIENT_SECRET || "",
        senderAddress: process.env.ORANGE_SENDER_ADDRESS || "",
    };
}
const bootConfig = loadConfigFromEnv();
if (!bootConfig.authorization || !bootConfig.clientId || !bootConfig.clientSecret || !bootConfig.senderAddress) {
    logger_1.logger.warn(CONTEXT, "Orange SMS config missing in .env; SMS sending will fail.");
}
if (staffPhoneNumbers().length === 0) {
    logger_1.logger.warn(CONTEXT, "STAFF_PHONE_NUMBERS is empty; no staff SMS will be sent.");
}
function staffPhoneNumbers() {
    return (process.env.STAFF_PHONE_NUMBERS || "")
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
}
function validateOrangeSmsConfig(config) {
    const missing = [];
    if (!config.authorization)
        missing.push("ORANGE_AUTHORIZATION");
    if (!config.clientId)
        missing.push("ORANGE_CLIENT_ID");
    if (!config.clientSecret)
        missing.push("ORANGE_CLIENT_SECRET");
    if (!config.senderAddress)
        missing.push("ORANGE_SENDER_ADDRESS");
    if (missing.length > 0) {
        throw new Error(`Orange SMS config missing: ${missing.join(", ")}`);
    }
}
class OrangeSmsService {
    constructor(config, fetchImpl = fetch) {
        this.config = config;
        this.fetchImpl = fetchImpl;
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    }
    invalidateToken() {
        this.accessToken = null;
        this.tokenExpiresAt = 0;
    }
    async getAccessToken() {
        const now = Date.now();
        if (this.accessToken && now < this.tokenExpiresAt - TOKEN_REFRESH_MARGIN_MS) {
            return this.accessToken;
        }
        if (!this.config.authorization || !this.config.clientId || !this.config.clientSecret || !this.config.senderAddress) {
            throw new OrangeSmsError("config", "Orange config missing (ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET, ORANGE_AUTHORIZATION or ORANGE_SENDER_ADDRESS missing).", { retryable: false });
        }
        const renewed = Boolean(this.accessToken);
        logger_1.logger.info(CONTEXT, renewed ? "OAuth token renewed" : "OAuth token retrieved");
        const response = await this.request(ORANGE_TOKEN_URL, {
            method: "POST",
            headers: {
                Authorization: this.config.authorization,
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            },
            body: "grant_type=client_credentials",
        });
        const rawBody = await response.text();
        logger_1.logger.info(CONTEXT, `OAuth HTTP ${response.status}`);
        if (!response.ok) {
            const classified = classifyHttpError(response.status, rawBody);
            const kind = classified.kind === "insufficient_units"
                ? classified.kind
                : response.status === 401 || response.status === 403
                    ? "invalid_credentials"
                    : classified.kind;
            const message = kind === "invalid_credentials" ? `invalid credentials (HTTP ${response.status})` : classified.message;
            throw new OrangeSmsError(kind, message, {
                status: response.status,
                retryable: kind === "invalid_credentials" || kind === "insufficient_units" ? false : classified.retryable,
            });
        }
        let data;
        try {
            data = JSON.parse(rawBody);
        }
        catch {
            throw new OrangeSmsError("unknown", "Orange OAuth response is not valid JSON.", { retryable: true });
        }
        if (!data.access_token) {
            throw new OrangeSmsError("authentication", "OAuth failed: access_token missing from response.", {
                retryable: false,
            });
        }
        const expiresInSec = typeof data.expires_in === "number" && data.expires_in > 0 ? data.expires_in : 3600;
        this.accessToken = data.access_token;
        this.tokenExpiresAt = Date.now() + expiresInSec * 1000;
        logger_1.logger.info(CONTEXT, renewed ? "OAuth token renewed" : "OAuth token retrieved", {
            expires_in: expiresInSec,
        });
        return this.accessToken;
    }
    async sendSms(phone, message) {
        const address = toOrangeAddress(phone);
        const masked = maskPhoneNumber(phone);
        const requestedAt = new Date();
        const orangeSmsUrl = buildOrangeSmsUrl(this.config.senderAddress);
        try {
            logger_1.logger.info(CONTEXT, `notification requested`);
            logger_1.logger.info(CONTEXT, `envoi demarre vers ${masked}`);
            const payload = await this.sendSmsWithRetry(address, message, masked, requestedAt, orangeSmsUrl);
            logger_1.logger.info(CONTEXT, `Orange HTTP ${payload.status}`);
            logger_1.logger.info(CONTEXT, "SMS accepted by Orange");
            if (payload.messageId) {
                logger_1.logger.info(CONTEXT, `Orange resource ID ${payload.messageId}`);
            }
            return {
                success: true,
                messageId: payload.messageId,
                attemptCount: payload.attemptCount,
                requestStartedAt: requestedAt.toISOString(),
                requestCompletedAt: payload.requestCompletedAt,
                requestDurationMs: payload.requestDurationMs,
                acceptedAt: payload.requestCompletedAt,
                orangeResourceId: payload.orangeResourceId ?? payload.messageId ?? null,
                orangeRequestId: payload.orangeRequestId ?? null,
                httpStatus: payload.status,
            };
        }
        catch (err) {
            const orangeErr = err instanceof OrangeSmsError
                ? err
                : new OrangeSmsError("unknown", err instanceof Error ? err.message : "Unknown error");
            logKind(orangeErr.kind, `SMS failed for ${masked}: ${orangeErr.message}`);
            return {
                success: false,
                errorMessage: orangeErr.message,
                errorKind: orangeErr.kind,
                attemptCount: orangeErr.attemptCount,
                requestStartedAt: orangeErr.requestStartedAt,
                requestCompletedAt: orangeErr.requestCompletedAt,
                requestDurationMs: orangeErr.requestDurationMs,
                orangeResourceId: orangeErr.orangeResourceId ?? null,
                orangeRequestId: orangeErr.orangeRequestId ?? null,
            };
        }
    }
    async sendOrderSms(tableNumber, message) {
        logger_1.logger.info(CONTEXT, `notification requested (table ${tableNumber})`);
        if (!this.config.authorization || !this.config.clientId || !this.config.clientSecret) {
            const errorMessage = "Orange config missing (ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET or ORANGE_AUTHORIZATION missing).";
            logger_1.logger.error(CONTEXT, "OAuth failed");
            return { success: false, errorMessage, errorKind: "config" };
        }
        const numbers = staffPhoneNumbers();
        if (numbers.length === 0) {
            const errorMessage = "No staff phone numbers configured (STAFF_PHONE_NUMBERS).";
            logger_1.logger.error(CONTEXT, errorMessage);
            return { success: false, errorMessage, errorKind: "config" };
        }
        const results = [];
        for (const phone of numbers) {
            results.push(await this.sendSms(phone, message));
        }
        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) {
            return {
                success: false,
                errorMessage: failed.map((f) => f.errorMessage).join(" | "),
                errorKind: failed[0].errorKind,
                messageId: results.find((r) => r.messageId)?.messageId,
            };
        }
        return {
            success: true,
            messageId: results.map((r) => r.messageId).filter(Boolean).join(","),
        };
    }
    async sendSmsWithRetry(address, message, masked, requestedAt, orangeSmsUrl) {
        let lastError;
        let tokenRefreshedAfter401 = false;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            const attemptStartedMs = Date.now();
            const attemptStartedAt = new Date();
            try {
                const token = await this.getAccessToken();
                const response = await this.request(orangeSmsUrl, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        outboundSMSMessageRequest: {
                            address,
                            senderAddress: this.config.senderAddress,
                            outboundSMSTextMessage: { message },
                        },
                    }),
                });
                const rawBody = await response.text();
                const requestDurationMs = Date.now() - attemptStartedMs;
                logger_1.logger.info(CONTEXT, `Orange HTTP ${response.status} (vers ${masked})`);
                if (response.status === 401 && !tokenRefreshedAfter401) {
                    tokenRefreshedAfter401 = true;
                    this.invalidateToken();
                    logger_1.logger.warn(CONTEXT, "retry (token expired, renewal)");
                    continue;
                }
                if (!response.ok) {
                    const classified = classifyHttpError(response.status, rawBody);
                    throw new OrangeSmsError(classified.kind, classified.message, {
                        status: response.status,
                        retryable: classified.retryable,
                    });
                }
                let parsed = null;
                try {
                    parsed = rawBody ? JSON.parse(rawBody) : null;
                }
                catch {
                    parsed = null;
                }
                const messageId = extractMessageId(parsed, response.headers);
                if (messageId) {
                    logger_1.logger.info(CONTEXT, `Orange resource ID ${messageId}`);
                }
                const requestCompletedAt = new Date().toISOString();
                return {
                    messageId,
                    body: rawBody,
                    status: response.status,
                    attemptCount: attempt + 1,
                    requestDurationMs,
                    requestCompletedAt,
                    orangeResourceId: messageId ?? null,
                    orangeRequestId: messageId ?? null,
                };
            }
            catch (err) {
                const orangeErr = err instanceof OrangeSmsError
                    ? err
                    : (() => {
                        const classified = classifyFetchFailure(err);
                        return new OrangeSmsError(classified.kind, classified.message, { retryable: classified.retryable });
                    })();
                orangeErr.attemptCount = attempt + 1;
                orangeErr.requestStartedAt = requestedAt.toISOString();
                orangeErr.requestCompletedAt = new Date().toISOString();
                orangeErr.requestDurationMs = Date.now() - attemptStartedMs;
                lastError = orangeErr;
                const attemptsLeft = this.maxRetries - attempt;
                if (orangeErr.retryable && attemptsLeft > 0) {
                    const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
                    logger_1.logger.warn(CONTEXT, `retry (${orangeErr.kind}, attempt ${attempt + 2}/${this.maxRetries + 1}, wait ${delay}ms)`);
                    await sleep(delay);
                    continue;
                }
                if (orangeErr.retryable) {
                    logger_1.logger.warn(CONTEXT, `retry abandoned (${orangeErr.kind}, no attempts left)`);
                }
                throw orangeErr;
            }
        }
        throw lastError ?? new OrangeSmsError("unknown", "retry abandoned");
    }
    async request(url, init) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            return await this.fetchImpl(url, { ...init, signal: controller.signal });
        }
        finally {
            clearTimeout(timeout);
        }
    }
}
exports.OrangeSmsService = OrangeSmsService;
let defaultService = null;
function getOrangeSmsService() {
    if (!defaultService) {
        defaultService = new OrangeSmsService(loadConfigFromEnv());
    }
    return defaultService;
}
async function sendOrderSms(tableNumber, message) {
    return getOrangeSmsService().sendOrderSms(tableNumber, message);
}
function resetOrangeSmsServiceForTests() {
    defaultService = null;
}
//# sourceMappingURL=orange-sms.service.js.map