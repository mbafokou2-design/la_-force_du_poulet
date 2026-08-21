import dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

const CONTEXT = "orange-sms.service.ts";

const ORANGE_TOKEN_URL = "https://api.orange.com/oauth/v3/token";
const ORANGE_SMS_URL =
  "https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B2370000/requests";
const ORANGE_SENDER_ADDRESS = "tel:+2370000";

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
}

export interface OrangeSmsConfig {
  authorization: string;
  clientId: string;
  clientSecret: string;
  timeoutMs?: number;
  maxRetries?: number;
}

type FetchLike = typeof fetch;

export class OrangeSmsError extends Error {
  readonly kind: SmsErrorKind;
  readonly status?: number;
  readonly retryable: boolean;

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

export function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  const visible = digits.slice(-4);
  const prefix = phone.trim().startsWith("+") ? "+" : "";
  const country = digits.length > 9 ? digits.slice(0, digits.length - 9) : "";
  return `${prefix}${country}******${visible}`;
}

/** Normalise un numéro camerounais vers le format Orange `tel:+237XXXXXXXXX`. */
export function toOrangeAddress(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
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

export function redactSecrets(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, "Basic [REDACTED]")
    .replace(/("access_token"\s*:\s*")[^"]+/gi, "$1[REDACTED]")
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
    text.includes("malformed") && text.includes("address")
  );
}

function classifyHttpError(status: number, body: string): { kind: SmsErrorKind; retryable: boolean; message: string } {
  const sanitized = redactSecrets(body).slice(0, 500);

  if (bodyIndicatesInsufficientUnits(body) || status === 402) {
    return {
      kind: "insufficient_units",
      retryable: false,
      message:
        "Orange SMS: insufficient units. Purchase an SMS bundle in Orange Developer.",
    };
  }

  if (status === 401) {
    return {
      kind: "invalid_credentials",
      retryable: false,
      message: `erreur invalid credentials (HTTP 401): ${sanitized}`,
    };
  }

  if (status === 403) {
    return {
      kind: "authentication",
      retryable: false,
      message: `erreur authentication (HTTP 403): ${sanitized}`,
    };
  }

  if (status === 429) {
    return {
      kind: "rate_limit",
      retryable: true,
      message: `erreur rate limit (HTTP 429): ${sanitized}`,
    };
  }

  if (bodyIndicatesInvalidNumber(body)) {
    return {
      kind: "invalid_number",
      retryable: false,
      message: `erreur numéro invalide (HTTP ${status}): ${sanitized}`,
    };
  }

  if (status >= 500) {
    return {
      kind: "http_5xx",
      retryable: true,
      message: `erreur Orange 5xx (HTTP ${status}): ${sanitized}`,
    };
  }

  if (status >= 400) {
    return {
      kind: "http_4xx",
      retryable: false,
      message: `erreur Orange 4xx (HTTP ${status}): ${sanitized}`,
    };
  }

  return {
    kind: "unknown",
    retryable: false,
    message: `erreur Orange HTTP ${status}: ${sanitized}`,
  };
}

function classifyFetchFailure(err: unknown): { kind: SmsErrorKind; retryable: boolean; message: string } {
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code || "";

  if (name === "AbortError" || message.toLowerCase().includes("timeout") || code === "ABORT_ERR") {
    return { kind: "timeout", retryable: true, message: `erreur timeout: ${message}` };
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
    return { kind: "network", retryable: true, message: `erreur réseau: ${message}` };
  }

  return { kind: "unknown", retryable: false, message: `erreur inconnue: ${message}` };
}

function extractMessageId(payload: unknown, headers: Headers): string | undefined {
  const headerId =
    headers.get("x-orange-ismg") ||
    headers.get("x-request-id") ||
    headers.get("location");
  if (headerId) return headerId;

  if (!payload || typeof payload !== "object") return undefined;
  const request = (payload as { outboundSMSMessageRequest?: Record<string, unknown> }).outboundSMSMessageRequest;
  if (!request) return undefined;

  const resourceURL = request.resourceURL;
  if (typeof resourceURL === "string" && resourceURL.length > 0) return resourceURL;

  const requestId = request.requestId ?? request.resourceId;
  if (typeof requestId === "string") return requestId;

  return undefined;
}

function logKind(kind: SmsErrorKind, message: string): void {
  logger.error(CONTEXT, message);
  switch (kind) {
    case "authentication":
      logger.error(CONTEXT, "erreur authentication");
      break;
    case "invalid_credentials":
      logger.error(CONTEXT, "erreur invalid credentials");
      break;
    case "insufficient_units":
      logger.error(CONTEXT, "Orange SMS: insufficient units. Purchase an SMS bundle in Orange Developer.");
      break;
    case "invalid_number":
      logger.error(CONTEXT, "erreur numéro invalide");
      break;
    case "rate_limit":
      logger.error(CONTEXT, "erreur rate limit");
      break;
    case "timeout":
      logger.error(CONTEXT, "erreur timeout");
      break;
    case "network":
      logger.error(CONTEXT, "erreur réseau");
      break;
    case "http_4xx":
      logger.error(CONTEXT, "erreur Orange 4xx");
      break;
    case "http_5xx":
      logger.error(CONTEXT, "erreur Orange 5xx");
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
  };
}

const bootConfig = loadConfigFromEnv();
if (!bootConfig.authorization || !bootConfig.clientId || !bootConfig.clientSecret) {
  logger.warn(
    CONTEXT,
    "ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET ou ORANGE_AUTHORIZATION manquant dans .env — l'envoi SMS échouera."
  );
}
if (staffPhoneNumbers().length === 0) {
  logger.warn(CONTEXT, "STAFF_PHONE_NUMBERS est vide dans .env — aucun SMS ne sera envoyé.");
}

function staffPhoneNumbers(): string[] {
  return (process.env.STAFF_PHONE_NUMBERS || "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

export class OrangeSmsService {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(
    private readonly config: OrangeSmsConfig,
    private readonly fetchImpl: FetchLike = fetch
  ) {
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  invalidateToken(): void {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - TOKEN_REFRESH_MARGIN_MS) {
      return this.accessToken;
    }

    if (!this.config.authorization || !this.config.clientId || !this.config.clientSecret) {
      throw new OrangeSmsError(
        "config",
        "Configuration Orange absente (ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET ou ORANGE_AUTHORIZATION manquant).",
        { retryable: false }
      );
    }

    const renewed = Boolean(this.accessToken);
    logger.info(CONTEXT, renewed ? "token Orange renouvelé (requête en cours)" : "token Orange récupéré (requête en cours)");

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
    logger.info(CONTEXT, `réponse HTTP Orange OAuth ${response.status}`);

    if (!response.ok) {
      const classified = classifyHttpError(response.status, rawBody);
      const kind =
        classified.kind === "insufficient_units"
          ? classified.kind
          : response.status === 401 || response.status === 403
            ? "invalid_credentials"
            : classified.kind;
      const message =
        kind === "invalid_credentials"
          ? `erreur invalid credentials (HTTP ${response.status})`
          : classified.message;
      throw new OrangeSmsError(kind, message, {
        status: response.status,
        retryable: kind === "invalid_credentials" || kind === "insufficient_units" ? false : classified.retryable,
      });
    }

    let data: { access_token?: string; expires_in?: number };
    try {
      data = JSON.parse(rawBody) as { access_token?: string; expires_in?: number };
    } catch {
      throw new OrangeSmsError("unknown", "Réponse OAuth Orange illisible (JSON invalide).", { retryable: true });
    }

    if (!data.access_token) {
      throw new OrangeSmsError("authentication", "erreur authentication: access_token absent de la réponse OAuth.", {
        retryable: false,
      });
    }

    const expiresInSec = typeof data.expires_in === "number" && data.expires_in > 0 ? data.expires_in : 3600;
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + expiresInSec * 1000;

    logger.info(CONTEXT, renewed ? "token Orange renouvelé" : "token Orange récupéré", {
      expires_in: expiresInSec,
    });

    return this.accessToken;
  }

  async sendSms(phone: string, message: string): Promise<SmsResult> {
    const address = toOrangeAddress(phone);
    const masked = maskPhoneNumber(phone);

    try {
      const payload = await this.sendSmsWithRetry(address, message, masked);
      const messageId = payload.messageId;
      logger.info(CONTEXT, `SMS envoyé avec succès vers ${masked}${messageId ? ` (id: ${messageId})` : ""}`);
      return { success: true, messageId };
    } catch (err) {
      const orangeErr =
        err instanceof OrangeSmsError
          ? err
          : new OrangeSmsError("unknown", err instanceof Error ? err.message : "Erreur inconnue");
      logKind(orangeErr.kind, `Échec SMS vers ${masked}: ${orangeErr.message}`);
      return { success: false, errorMessage: orangeErr.message, errorKind: orangeErr.kind };
    }
  }

  /**
   * Envoie le récapitulatif de commande à tous les numéros du staff.
   * Ne jette jamais : success:false si l'envoi échoue.
   */
  async sendOrderSms(tableNumber: string, message: string): Promise<SmsResult> {
    logger.info(CONTEXT, `notification SMS demandée (table ${tableNumber})`);

    if (!this.config.authorization || !this.config.clientId || !this.config.clientSecret) {
      const errorMessage =
        "Configuration Orange absente (ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET ou ORANGE_AUTHORIZATION manquant).";
      logger.error(CONTEXT, errorMessage);
      return { success: false, errorMessage, errorKind: "config" };
    }

    const numbers = staffPhoneNumbers();
    if (numbers.length === 0) {
      const errorMessage = "Aucun numéro de serveuse configuré (STAFF_PHONE_NUMBERS).";
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
    masked: string
  ): Promise<{ messageId?: string; body: string; status: number }> {
    let lastError: OrangeSmsError | undefined;
    let tokenRefreshedAfter401 = false;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const token = await this.getAccessToken();
        const response = await this.request(ORANGE_SMS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outboundSMSMessageRequest: {
              address,
              senderAddress: ORANGE_SENDER_ADDRESS,
              outboundSMSTextMessage: { message },
            },
          }),
        });

        const rawBody = await response.text();
        logger.info(CONTEXT, `réponse HTTP Orange ${response.status} (SMS vers ${masked})`);
        logger.info(CONTEXT, `réponse HTTP Orange body: ${redactSecrets(rawBody).slice(0, 800)}`);

        if (response.status === 401 && !tokenRefreshedAfter401) {
          tokenRefreshedAfter401 = true;
          this.invalidateToken();
          logger.warn(CONTEXT, "retry effectué (token SMS expiré, renouvellement)");
          continue;
        }

        if (!response.ok) {
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

        const messageId = extractMessageId(parsed, response.headers);
        if (messageId) {
          logger.info(CONTEXT, `message/request id Orange: ${messageId}`);
        }

        return { messageId, body: rawBody, status: response.status };
      } catch (err) {
        const orangeErr =
          err instanceof OrangeSmsError
            ? err
            : (() => {
                const classified = classifyFetchFailure(err);
                return new OrangeSmsError(classified.kind, classified.message, { retryable: classified.retryable });
              })();

        lastError = orangeErr;

        const attemptsLeft = this.maxRetries - attempt;
        if (orangeErr.retryable && attemptsLeft > 0) {
          const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
          logger.warn(CONTEXT, `retry effectué (${orangeErr.kind}, tentative ${attempt + 2}/${this.maxRetries + 1}, attente ${delay}ms)`);
          await sleep(delay);
          continue;
        }

        if (orangeErr.retryable) {
          logger.warn(CONTEXT, `retry abandonné (${orangeErr.kind}, plus de tentatives)`);
        }

        throw orangeErr;
      }
    }

    throw lastError ?? new OrangeSmsError("unknown", "retry abandonné");
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

/** Point d'entrée compatible avec le contrôleur de commandes existant. */
export async function sendOrderSms(tableNumber: string, message: string): Promise<SmsResult> {
  return getOrangeSmsService().sendOrderSms(tableNumber, message);
}

export function resetOrangeSmsServiceForTests(): void {
  defaultService = null;
}
