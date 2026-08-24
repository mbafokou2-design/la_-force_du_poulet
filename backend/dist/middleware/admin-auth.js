"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuthConstants = void 0;
exports.parseCookies = parseCookies;
exports.issueAdminSessionToken = issueAdminSessionToken;
exports.verifyAdminSessionToken = verifyAdminSessionToken;
exports.getAdminCookieOptions = getAdminCookieOptions;
exports.requireAdminAuth = requireAdminAuth;
exports.isAdminAuthed = isAdminAuthed;
const crypto_1 = __importDefault(require("crypto"));
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || "2032";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "lfp-admin-session-secret";
const ADMIN_SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS || 8 * 60 * 60 * 1000);
const COOKIE_NAME = "lfp_admin_session";
function timingSafeEqualString(a, b) {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length)
        return false;
    return crypto_1.default.timingSafeEqual(aBuf, bBuf);
}
function parseCookies(cookieHeader) {
    if (!cookieHeader)
        return {};
    return cookieHeader.split(";").reduce((acc, chunk) => {
        const [key, ...rest] = chunk.trim().split("=");
        if (!key)
            return acc;
        acc[key] = decodeURIComponent(rest.join("=") || "");
        return acc;
    }, {});
}
function issueAdminSessionToken(now = Date.now()) {
    const issuedAt = String(now);
    const signature = crypto_1.default.createHmac("sha256", ADMIN_SESSION_SECRET).update(`${ADMIN_ACCESS_CODE}:${issuedAt}`).digest("hex");
    return `${issuedAt}.${signature}`;
}
function verifyAdminSessionToken(token, now = Date.now()) {
    if (!token)
        return false;
    const [issuedAtRaw, signature] = token.split(".");
    if (!issuedAtRaw || !signature)
        return false;
    const issuedAt = Number(issuedAtRaw);
    if (!Number.isFinite(issuedAt) || now - issuedAt > ADMIN_SESSION_TTL_MS || issuedAt > now + 60000) {
        return false;
    }
    const expected = issueAdminSessionToken(issuedAt).split(".")[1];
    return timingSafeEqualString(signature, expected);
}
function getAdminCookieOptions(maxAgeMs = ADMIN_SESSION_TTL_MS) {
    const secure = process.env.NODE_ENV === "production";
    return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}${secure ? "; Secure" : ""}`;
}
function requireAdminAuth(req, res, next) {
    const cookies = parseCookies(req.headers.cookie);
    if (verifyAdminSessionToken(cookies[COOKIE_NAME])) {
        return next();
    }
    return res.status(401).json({ error: "Authentication required." });
}
function isAdminAuthed(req) {
    const cookies = parseCookies(req.headers.cookie);
    return verifyAdminSessionToken(cookies[COOKIE_NAME]);
}
exports.adminAuthConstants = {
    ADMIN_ACCESS_CODE,
    COOKIE_NAME,
};
//# sourceMappingURL=admin-auth.js.map