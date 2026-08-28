"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginServer = loginServer;
exports.getServerSession = getServerSession;
exports.requireServerAuth = requireServerAuth;
const crypto_1 = __importDefault(require("crypto"));
const admin_auth_1 = require("./admin-auth");
const ACCESS_CODE = process.env.SERVER_ACCESS_CODE || process.env.ADMIN_ACCESS_CODE || "2032";
const SECRET = process.env.SERVER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || "change-me-in-production";
const TTL_MS = Number(process.env.SERVER_SESSION_TTL_MS || 30 * 24 * 60 * 60 * 1000);
const COOKIE_NAME = "lfp_server_session";
function safeEqual(a, b) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && crypto_1.default.timingSafeEqual(left, right);
}
function issueToken(now = Date.now()) {
    const issuedAt = String(now);
    const signature = crypto_1.default.createHmac("sha256", SECRET).update(`${ACCESS_CODE}:${issuedAt}`).digest("hex");
    return `${issuedAt}.${signature}`;
}
function validToken(token, now = Date.now()) {
    if (!token)
        return false;
    const [issuedAtRaw, signature] = token.split(".");
    const issuedAt = Number(issuedAtRaw);
    if (!signature || !Number.isFinite(issuedAt) || now - issuedAt > TTL_MS || issuedAt > now + 60000)
        return false;
    return safeEqual(signature, issueToken(issuedAt).split(".")[1]);
}
function cookie(maxAgeMs) {
    return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
function loginServer(req, res) {
    const code = String(req.body?.code || "");
    if (!safeEqual(code, ACCESS_CODE))
        return res.status(401).json({ error: "Code serveur invalide." });
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${encodeURIComponent(issueToken())}; ${cookie(TTL_MS)}`);
    return res.json({ authenticated: true });
}
function getServerSession(req, res) {
    return res.json({ authenticated: validToken((0, admin_auth_1.parseCookies)(req.headers.cookie)[COOKIE_NAME]) });
}
function requireServerAuth(req, res, next) {
    if (validToken((0, admin_auth_1.parseCookies)(req.headers.cookie)[COOKIE_NAME]))
        return next();
    return res.status(401).json({ error: "Authentification serveur requise." });
}
//# sourceMappingURL=server-auth.js.map