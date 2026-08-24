import dotenv from "dotenv";
import { logger } from "../utils/logger";
import {
  maskPhoneNumber as maskPhoneNumberShared,
  normalizeOrangeAddress,
  normalizeOrangeResourceId,
} from "../utils/sms";

dotenv.config();

const CONTEXT = "SMS";

const ORANGE_TOKEN_URL = "https://api.orange.com/oauth/v3/token";

const TOKEN_REFRESH_MARGIN_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;

export type SmsErrorKind =
  | "authentication"
  | "invalid_credentials"
  | "insufficient_units"
  | "invalid_number"
  | "rate_limit"
  | "timeout"
  | "network"
  | "http_4xx"
  | "http_5xx"
  | "config"
  | "unknown";

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

export class OrangeSmsError extends Error {
  readonly kind: SmsErrorKind;
  readonly status?: number;
  readonly retryable: boolean;
  attemptCount?: number;
  requestDurationMs?: number;
  requestStartedAt?: string;
  requestCompletedAt?: string;
  orangeResourceId?: string | null;
  orangeRequestId?: string | null;

  constructor(kind: SmsErrorKind, message: string, options?: { status?: number; retryable?: boolean }) {
    super(message);
    this.name = "OrangeSmsError";
    this.kind = kind;
    this.status = options?.status;
    this.retryable = options?.retryable ?? false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildOrangeSmsUrl(senderAddress: string): string {
  return `https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent(senderAddress)}/requests`;
}

function summarizeSmsMessage(message: string): { length: number; preview: string } {
  const clean = message.replace(/\s+/g, " ").trim();
  return {
    length: clean.length,
    preview: clean.length > 120 ? `${clean.slice(0, 117)}...` : clean,
  };
}

export function maskPhoneNumber(phone: string): string {
  return maskPhoneNumberShared(phone);
}

export function toOrangeAddress(phone: string): string {
  return normalizeOrangeAddress(phone);
}

export function redactSecrets(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, "Basic [REDACTED]")
    .replace(/("access_token"\s*:\s*")[^"]+/gi, '$1[REDACTED]')
    .replace(/(client_secret|ORANGE_CLIENT_SECRET|ORANGE_AUTHORIZATION)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
}

function bodyIndicatesInsufficientUnits(body: string): boolean {
  const text = body.toLowerCase();
  return (
    text.includes("insufficient") ||
    text.includes("no units") ||
    text.includes("no credit") ||
    text.includes("not enough") ||
    text.includes("balance") ||
    text.includes("quota") ||
    text.includes("bundle") ||
    text.includes("out of credit")
  );
}

function bodyIndicatesInvalidNumber(body: string): boolean {
  const text = body.toLowerCase();
  return (
    text.includes("invalid number") ||
    text.includes("invalid address") ||
    text.includes("invalid msisdn") ||
    text.includes("unknown subscriber") ||
    (text.includes("malformed") && text.includes("address"))
  );
}

function classifyHttpError(status: number, body: string): { kind: SmsErrorKind; retryable: boolean; message: string } {
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

function classifyFetchFailure(err: unknown): { kind: SmsErrorKind; retryable: boolean; message: string } {
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code || "";

  if (name === "AbortError" || message.toLowerCase().includes("timeout") || code === "ABORT_ERR") {
    return { kind: "timeout", retryable: true, message: `timeout: ${message}` };
  }

  if (
    name === "TypeError" ||
    code === "ECONNRESET" ||
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    message.toLowerCase().includes("fetch") ||
    message.toLowerCase().includes("network")
  ) {
    return { kind: "network", retryable: true, message: `network error: ${message}` };
  }

  return { kind: "unknown", retryable: false, message: `unknown error: ${message}` };
}

function extractMessageId(payload: unknown, headers: Headers): string | undefined {
  const headerId = headers.get("x-orange-ismg") || headers.get("x-request-id") || headers.get("location");
  if (headerId) return normalizeOrangeResourceId(headerId) || headerId;

  if (!payload || typeof payload !== "object") return undefined;
  const request = (payload as { outboundSMSMessageRequest?: Record<string, unknown> }).outboundSMSMessageRequest;
  if (!request) return undefined;

  const resourceURL = request.resourceURL;
  if (typeof resourceURL === "string" && resourceURL.length > 0) {
    return normalizeOrangeResourceId(resourceURL) || resourceURL;
  }

  const requestId = request.requestId ?? request.resourceId;
  if (typeof requestId === "string") return normalizeOrangeResourceId(requestId) || requestId;

  return undefined;
}

function extractOrangeIdentifiers(
  payload: unknown,
  headers: Headers
): {
  resourceURL: string | null;
  id: string | null;
  messageId: string | null;
  requestId: string | null;
  location: string | null;
  xRequestId: string | null;
} {
  const location = headers.get("location");
  const xRequestId = headers.get("x-request-id");

  const request =
    payload && typeof payload === "object"
      ? ((payload as { outboundSMSMessageRequest?: Record<string, unknown> }).outboundSMSMessageRequest ?? null)
      : null;

  const resourceURL = request && typeof request.resourceURL === "string" ? request.resourceURL : null;
  const id =
    request && typeof request.id === "string"
      ? request.id
      : payload && typeof payload === "object" && typeof (payload as { id?: unknown }).id === "string"
        ? ((payload as { id: string }).id)
        : null;
  const messageId =
    request && typeof request.messageId === "string"
      ? request.messageId
      : payload && typeof payload === "object" && typeof (payload as { messageId?: unknown }).messageId === "string"
        ? ((payload as { messageId: string }).messageId)
        : null;
  const requestId =
    request && typeof request.requestId === "string"
      ? request.requestId
      : request && typeof request.resourceId === "string"
        ? request.resourceId
        : null;

  return {
    resourceURL: resourceURL ? normalizeOrangeResourceId(resourceURL) || resourceURL : null,
    id: id ? normalizeOrangeResourceId(id) || id : null,
    messageId: messageId ? normalizeOrangeResourceId(messageId) || messageId : null,
    requestId: requestId ? normalizeOrangeResourceId(requestId) || requestId : null,
    location: location ? normalizeOrangeResourceId(location) || location : null,
    xRequestId: xRequestId ? normalizeOrangeResourceId(xRequestId) || xRequestId : null,
  };
}

function logKind(kind: SmsErrorKind, message: string): void {
  logger.error(CONTEXT, message);
  switch (kind) {
    case "authentication":
      logger.error(CONTEXT, "authentication failed");
      break;
    case "invalid_credentials":
      logger.error(CONTEXT, "invalid credentials");
      break;
    case "insufficient_units":
      logger.error(CONTEXT, "insufficient units / bundle required");
      break;
    case "invalid_number":
      logger.error(CONTEXT, "invalid recipient");
      break;
    case "rate_limit":
      logger.error(CONTEXT, "rate limit");
      break;
    case "timeout":
      logger.error(CONTEXT, "timeout");
      break;
    case "network":
      logger.error(CONTEXT, "network error");
      break;
    case "http_4xx":
      logger.error(CONTEXT, "Orange 4xx");
      break;
    case "http_5xx":
      logger.error(CONTEXT, "Orange 5xx");
      break;
    default:
      break;
  }
}

function loadConfigFromEnv(): OrangeSmsConfig {
  return {
    authorization: process.env.ORANGE_AUTHORIZATION || "",
    clientId: process.env.ORANGE_CLIENT_ID || "",
    clientSecret: process.env.ORANGE_CLIENT_SECRET || "",
    senderAddress: process.env.ORANGE_SMS_SENDER || "",
  };
}

const bootConfig = loadConfigFromEnv();
if (!bootConfig.authorization || !bootConfig.clientId || !bootConfig.clientSecret || !bootConfig.senderAddress) {
  logger.warn(CONTEXT, "Orange SMS config missing in .env; SMS sending will fail.");
}
if (staffPhoneNumbers().length === 0) {
  logger.warn(CONTEXT, "STAFF_PHONE_NUMBERS is empty; no staff SMS will be sent.");
}

function staffPhoneNumbers(): string[] {
  return (process.env.STAFF_PHONE_NUMBERS || "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

export function validateOrangeSmsConfig(config: OrangeSmsConfig): void {
  const missing: string[] = [];
  if (!config.authorization) missing.push("ORANGE_AUTHORIZATION");
  if (!config.clientId) missing.push("ORANGE_CLIENT_ID");
  if (!config.clientSecret) missing.push("ORANGE_CLIENT_SECRET");
  if (!config.senderAddress) missing.push("ORANGE_SMS_SENDER");

  if (missing.length > 0) {
    throw new Error(`Orange SMS config missing: ${missing.join(", ")}`);
  }
}

export class OrangeSmsService {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(private readonly config: OrangeSmsConfig, private readonly fetchImpl: FetchLike = fetch) {
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  invalidateToken(): void {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  private hasValidAccessToken(now = Date.now()): boolean {
    return Boolean(this.accessToken && now < this.tokenExpiresAt - TOKEN_REFRESH_MARGIN_MS);
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - TOKEN_REFRESH_MARGIN_MS) {
      return this.accessToken;
    }

    if (!this.config.authorization || !this.config.clientId || !this.config.clientSecret || !this.config.senderAddress) {
      throw new OrangeSmsError(
        "config",
        "Orange config missing (ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET, ORANGE_AUTHORIZATION or ORANGE_SMS_SENDER missing).",
        { retryable: false }
      );
    }

    const renewed = Boolean(this.accessToken);
    logger.info(CONTEXT, renewed ? "OAuth token renewed" : "OAuth token retrieved");

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
    logger.info(CONTEXT, `OAuth HTTP ${response.status}`);

    if (!response.ok) {
      const classified = classifyHttpError(response.status, rawBody);
      const kind =
        classified.kind === "insufficient_units"
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

    let data: { access_token?: string; expires_in?: number };
    try {
      data = JSON.parse(rawBody) as { access_token?: string; expires_in?: number };
    } catch {
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

    logger.info(CONTEXT, renewed ? "OAuth token renewed" : "OAuth token retrieved", {
      expires_in: expiresInSec,
    });

    return this.accessToken;
  }

  async sendSms(phone: string, message: string): Promise<SmsResult> {
    const address = toOrangeAddress(phone);
    const masked = maskPhoneNumber(phone);
    const requestedAt = new Date();
    const orangeSmsUrl = buildOrangeSmsUrl(this.config.senderAddress);

    try {
      logger.info(CONTEXT, "[SMS TEST] Orange request starting");
      logger.info(CONTEXT, `[SMS TEST] senderAddress réellement envoyé: ${this.config.senderAddress}`);
      logger.info(CONTEXT, `[SMS TEST] recipient: ${masked}`);
      logger.info(CONTEXT, `Orange SMS request prepared -> senderUsed="${this.config.senderAddress}", maskedRecipient="${masked}", url="${orangeSmsUrl}"`);
      logger.info(CONTEXT, `Orange API URL -> ${orangeSmsUrl}`);
      logger.info(CONTEXT, `Orange HTTP method -> POST`);
      logger.info(CONTEXT, `OAuth token status -> ${this.hasValidAccessToken() ? "cached" : "fetching"}`);
      const payload = await this.sendSmsWithRetry(address, message, masked, requestedAt, orangeSmsUrl);
      logger.info(CONTEXT, `Orange SMS accepted -> httpStatus=${payload.status}, attempts=${payload.attemptCount ?? 0}`);
      if (payload.messageId) {
        logger.info(CONTEXT, `Orange resource ID ${payload.messageId}`);
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
    } catch (err) {
      const orangeErr =
        err instanceof OrangeSmsError
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
        httpStatus: orangeErr.status,
      };
    }
  }

  async sendOrderSms(tableNumber: string, message: string): Promise<SmsResult> {
    logger.info(CONTEXT, `notification requested (table ${tableNumber})`);

    if (!this.config.authorization || !this.config.clientId || !this.config.clientSecret) {
      const errorMessage = "Orange config missing (ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET or ORANGE_AUTHORIZATION missing).";
      logger.error(CONTEXT, "OAuth failed");
      return { success: false, errorMessage, errorKind: "config" };
    }

    const numbers = staffPhoneNumbers();
    if (numbers.length === 0) {
      const errorMessage = "No staff phone numbers configured (STAFF_PHONE_NUMBERS).";
      logger.error(CONTEXT, errorMessage);
      return { success: false, errorMessage, errorKind: "config" };
    }

    const results: SmsResult[] = [];
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

  private async sendSmsWithRetry(
    address: string,
    message: string,
    masked: string,
    requestedAt: Date,
    orangeSmsUrl: string
  ): Promise<{
    messageId?: string;
    body: string;
    status: number;
    attemptCount: number;
    requestDurationMs: number;
    requestCompletedAt: string;
    orangeResourceId?: string | null;
    orangeRequestId?: string | null;
  }> {
    let lastError: OrangeSmsError | undefined;
    let tokenRefreshedAfter401 = false;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const attemptStartedMs = Date.now();
      const attemptStartedAt = new Date();

      try {
        logger.info(CONTEXT, `SMS request started -> attempt ${attempt + 1}/${this.maxRetries + 1}`);
        const token = await this.getAccessToken();
        logger.info(CONTEXT, "OAuth token obtained -> yes");
        const messageSummary = summarizeSmsMessage(message);
        logger.info(
          CONTEXT,
          `SMS request payload -> ${JSON.stringify({
            event: "SMS request payload",
            senderUsed: this.config.senderAddress,
            maskedRecipient: masked,
            recipientAddress: address,
            messageLength: messageSummary.length,
            messagePreview: messageSummary.preview,
            method: "POST",
            url: orangeSmsUrl,
          })}`
        );
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
        logger.info(CONTEXT, `Orange HTTP ${response.status} (recipient ${masked})`);
        logger.info(CONTEXT, `Orange HTTP status returned -> ${response.status}`);
        logger.info(CONTEXT, `Orange response body returned -> ${redactSecrets(rawBody).slice(0, 800) || "[empty]"}`);
        logger.info(CONTEXT, `[SMS TEST] HTTP status: ${response.status}`);

        if (response.status === 401 && !tokenRefreshedAfter401) {
          tokenRefreshedAfter401 = true;
          this.invalidateToken();
          logger.warn(CONTEXT, "retry (token expired, renewal)");
          continue;
        }

        if (!response.ok) {
          logger.warn(CONTEXT, `Orange response body (error): ${redactSecrets(rawBody).slice(0, 800)}`);
          const classified = classifyHttpError(response.status, rawBody);
          throw new OrangeSmsError(classified.kind, classified.message, {
            status: response.status,
            retryable: classified.retryable,
          });
        }

        let parsed: unknown = null;
        try {
          parsed = rawBody ? JSON.parse(rawBody) : null;
        } catch {
          parsed = null;
        }

        const orangeIdentifiers = extractOrangeIdentifiers(parsed, response.headers);
        logger.info(
          CONTEXT,
          `Orange identifiers -> ${JSON.stringify(orangeIdentifiers)}`
        );

        const messageId = extractMessageId(parsed, response.headers);
        if (messageId) {
          logger.info(CONTEXT, `Orange resource ID ${messageId}`);
          logger.info(CONTEXT, `[SMS TEST] Orange Resource ID: ${messageId}`);
        }

        logger.info(CONTEXT, `[SMS TEST] Response accepted: ${response.ok ? "true" : "false"}`);
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
      } catch (err) {
        const orangeErr =
          err instanceof OrangeSmsError
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
          logger.warn(CONTEXT, `retry (${orangeErr.kind}, attempt ${attempt + 2}/${this.maxRetries + 1}, wait ${delay}ms)`);
          await sleep(delay);
          continue;
        }

        if (orangeErr.retryable) {
          logger.warn(CONTEXT, `retry abandoned (${orangeErr.kind}, no attempts left)`);
        }

        throw orangeErr;
      }
    }

    throw lastError ?? new OrangeSmsError("unknown", "retry abandoned");
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }
}

let defaultService: OrangeSmsService | null = null;

export function getOrangeSmsService(): OrangeSmsService {
  if (!defaultService) {
    defaultService = new OrangeSmsService(loadConfigFromEnv());
  }
  return defaultService;
}

export async function sendOrderSms(tableNumber: string, message: string): Promise<SmsResult> {
  return getOrangeSmsService().sendOrderSms(tableNumber, message);
}

export function resetOrangeSmsServiceForTests(): void {
  defaultService = null;
}
