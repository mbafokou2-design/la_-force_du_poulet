import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OrangeSmsError,
  OrangeSmsService,
  maskPhoneNumber,
  redactSecrets,
  toOrangeAddress,
} from "../services/orange-sms.service";

const CONFIG = {
  authorization: "Basic dGVzdA==",
  clientId: "client-id",
  clientSecret: "super-secret-value",
  senderAddress: "tel:+2370000",
};

const TOKEN_JSON = JSON.stringify({ access_token: "tok_abc", expires_in: 3600 });
const SMS_OK_JSON = JSON.stringify({
  outboundSMSMessageRequest: {
    address: ["tel:+237650000000"],
    senderAddress: "tel:+2370000",
    resourceURL: "https://api.orange.com/smsmessaging/v1/outbound/requests/req-123",
  },
});

function jsonResponse(status: number, body: string, headers?: Record<string, string>): Response {
  return new Response(body, { status, headers: { "Content-Type": "application/json", ...headers } });
}

function makeFetch(handler: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  return async (url: string | URL | Request, init?: RequestInit) => {
    const href = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    return handler(href, init);
  };
}

describe("helpers", () => {
  it("masks the phone number", () => {
    assert.equal(maskPhoneNumber("+237650123456"), "+237******3456");
  });

  it("normalizes to tel:+237...", () => {
    assert.equal(toOrangeAddress("+237650123456"), "tel:+237650123456");
    assert.equal(toOrangeAddress("650123456"), "tel:+237650123456");
    assert.equal(toOrangeAddress("237650123456"), "tel:+237650123456");
  });

  it("does not leak secrets in logs", () => {
    const redacted = redactSecrets('Bearer tok_abc Authorization: Basic dGVzdA== "access_token": "tok_abc"');
    assert.equal(redacted.includes("tok_abc"), false);
    assert.equal(redacted.includes("dGVzdA=="), false);
  });
});

describe("OrangeSmsService - OAuth", () => {
  it("successful OAuth token", async () => {
    let tokenCalls = 0;
    const fetchImpl = makeFetch(async (url) => {
      if (url.includes("/oauth/v3/token")) {
        tokenCalls += 1;
        return jsonResponse(200, TOKEN_JSON);
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const service = new OrangeSmsService(CONFIG, fetchImpl as typeof fetch);
    const token = await service.getAccessToken();
    assert.equal(token, "tok_abc");
    const token2 = await service.getAccessToken();
    assert.equal(token2, "tok_abc");
    assert.equal(tokenCalls, 1, "the token must be cached");
  });

  it("failed OAuth token", async () => {
    const fetchImpl = makeFetch(async () => jsonResponse(500, '{"error":"unavailable"}'));
    const service = new OrangeSmsService(CONFIG, fetchImpl as typeof fetch);
    await assert.rejects(() => service.getAccessToken(), (err: unknown) => {
      assert.ok(err instanceof OrangeSmsError);
      assert.equal(err.kind, "http_5xx");
      return true;
    });
  });
});

describe("OrangeSmsService - SMS sending", () => {
  it("successful SMS", async () => {
    let observedSenderAddress: string | null = null;
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      const href = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
      if (href.includes("/oauth/v3/token")) return jsonResponse(200, TOKEN_JSON);
      if (href.includes("/smsmessaging/")) {
        const body = JSON.parse(String(init?.body || "{}")) as {
          outboundSMSMessageRequest?: { senderAddress?: string };
        };
        observedSenderAddress = body.outboundSMSMessageRequest?.senderAddress || null;
        return jsonResponse(201, SMS_OK_JSON);
      }
      throw new Error(href);
    }) as typeof fetch;

    const service = new OrangeSmsService(CONFIG, fetchImpl);
    const result = await service.sendSms("+237650123456", "hello");
    assert.equal(result.success, true);
    assert.match(result.messageId || "", /req-123/);
    assert.equal(typeof result.requestDurationMs, "number");
    assert.equal(observedSenderAddress, CONFIG.senderAddress);
  });

  it("invalid credentials", async () => {
    const fetchImpl = makeFetch(async (url) => {
      if (url.includes("/oauth/v3/token")) return jsonResponse(401, '{"error":"invalid_client"}');
      throw new Error(url);
    });
    const service = new OrangeSmsService(CONFIG, fetchImpl as typeof fetch);
    const result = await service.sendSms("+237650123456", "hello");
    assert.equal(result.success, false);
    assert.equal(result.errorKind, "invalid_credentials");
    assert.equal(result.httpStatus, 401);
  });

  it("insufficient bundle", async () => {
    const fetchImpl = makeFetch(async (url) => {
      if (url.includes("/oauth/v3/token")) return jsonResponse(200, TOKEN_JSON);
      return jsonResponse(403, '{"message":"Insufficient units, no credit left"}');
    });
    const service = new OrangeSmsService(CONFIG, fetchImpl as typeof fetch);
    const result = await service.sendSms("+237650123456", "hello");
    assert.equal(result.success, false);
    assert.equal(result.errorKind, "insufficient_units");
    assert.match(result.errorMessage || "", /insufficient units/i);
    assert.equal(result.httpStatus, 403);
  });

  it("invalid number", async () => {
    const fetchImpl = makeFetch(async (url) => {
      if (url.includes("/oauth/v3/token")) return jsonResponse(200, TOKEN_JSON);
      return jsonResponse(400, '{"message":"Invalid MSISDN address"}');
    });
    const service = new OrangeSmsService({ ...CONFIG, maxRetries: 0 }, fetchImpl as typeof fetch);
    const result = await service.sendSms("00", "hello");
    assert.equal(result.success, false);
    assert.equal(result.errorKind, "invalid_number");
  });

  it("timeout", async () => {
    const fetchImpl = makeFetch(async (url) => {
      if (url.includes("/oauth/v3/token")) return jsonResponse(200, TOKEN_JSON);
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    });
    const service = new OrangeSmsService({ ...CONFIG, maxRetries: 0 }, fetchImpl as typeof fetch);
    const result = await service.sendSms("+237650123456", "hello");
    assert.equal(result.success, false);
    assert.equal(result.errorKind, "timeout");
  });

  it("4xx error", async () => {
    const fetchImpl = makeFetch(async (url) => {
      if (url.includes("/oauth/v3/token")) return jsonResponse(200, TOKEN_JSON);
      return jsonResponse(409, '{"message":"conflict"}');
    });
    const service = new OrangeSmsService({ ...CONFIG, maxRetries: 0 }, fetchImpl as typeof fetch);
    const result = await service.sendSms("+237650123456", "hello");
    assert.equal(result.success, false);
    assert.equal(result.errorKind, "http_4xx");
    assert.equal(result.httpStatus, 409);
  });

  it("5xx error", async () => {
    const fetchImpl = makeFetch(async (url) => {
      if (url.includes("/oauth/v3/token")) return jsonResponse(200, TOKEN_JSON);
      return jsonResponse(503, '{"message":"unavailable"}');
    });
    const service = new OrangeSmsService({ ...CONFIG, maxRetries: 0 }, fetchImpl as typeof fetch);
    const result = await service.sendSms("+237650123456", "hello");
    assert.equal(result.success, false);
    assert.equal(result.errorKind, "http_5xx");
    assert.equal(result.httpStatus, 503);
  });

  it("retries transient error then succeeds", async () => {
    let smsAttempts = 0;
    const fetchImpl = makeFetch(async (url) => {
      if (url.includes("/oauth/v3/token")) return jsonResponse(200, TOKEN_JSON);
      smsAttempts += 1;
      if (smsAttempts < 3) return jsonResponse(502, '{"message":"bad gateway"}');
      return jsonResponse(201, SMS_OK_JSON);
    });
    const service = new OrangeSmsService({ ...CONFIG, maxRetries: 2 }, fetchImpl as typeof fetch);
    const result = await service.sendSms("+237650123456", "hello");
    assert.equal(result.success, true);
    assert.equal(smsAttempts, 3);
  });

  it("does not retry a credit error", async () => {
    let smsAttempts = 0;
    const fetchImpl = makeFetch(async (url) => {
      if (url.includes("/oauth/v3/token")) return jsonResponse(200, TOKEN_JSON);
      smsAttempts += 1;
      return jsonResponse(403, '{"message":"no units remaining"}');
    });
    const service = new OrangeSmsService({ ...CONFIG, maxRetries: 3 }, fetchImpl as typeof fetch);
    const result = await service.sendSms("+237650123456", "hello");
    assert.equal(result.success, false);
    assert.equal(result.errorKind, "insufficient_units");
    assert.equal(smsAttempts, 1);
  });
});
