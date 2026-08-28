"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfiguredPublicBaseUrl = getConfiguredPublicBaseUrl;
exports.resolvePublicBaseUrl = resolvePublicBaseUrl;
function normalizeBaseUrl(value) {
    return value.trim().replace(/\/+$/, "");
}
function deriveUrlFromRequest(req) {
    const protoHeader = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
    const host = forwardedHost || req.get("host") || "";
    if (!host)
        return null;
    const originHeader = req.get("origin") || "";
    if (originHeader) {
        try {
            return normalizeBaseUrl(new URL(originHeader).origin);
        }
        catch {
            // continue with host/proto inference
        }
    }
    const proto = protoHeader || (req.secure ? "https" : "http");
    return normalizeBaseUrl(`${proto}://${host}`);
}
function getConfiguredPublicBaseUrl() {
    const envUrl = process.env.PUBLIC_BASE_URL ||
        process.env.FRONTEND_BASE_URL ||
        (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "") ||
        process.env.RAILWAY_STATIC_URL ||
        process.env.DEPLOY_URL ||
        "http://localhost:4000";
    return normalizeBaseUrl(envUrl);
}
function resolvePublicBaseUrl(req) {
    if (req) {
        const derived = deriveUrlFromRequest(req);
        if (derived)
            return derived;
    }
    return getConfiguredPublicBaseUrl();
}
//# sourceMappingURL=public-url.js.map