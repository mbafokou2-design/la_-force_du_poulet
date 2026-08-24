"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginAdmin = loginAdmin;
exports.getAdminSession = getAdminSession;
exports.logoutAdmin = logoutAdmin;
const admin_auth_1 = require("../middleware/admin-auth");
const ADMIN_ACCESS_CODE = admin_auth_1.adminAuthConstants.ADMIN_ACCESS_CODE;
const COOKIE_NAME = admin_auth_1.adminAuthConstants.COOKIE_NAME;
function clearCookie(res) {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=; ${(0, admin_auth_1.getAdminCookieOptions)(0)}`);
}
async function loginAdmin(req, res) {
    const code = String(req.body?.code ?? "").trim();
    if (!code) {
        return res.status(400).json({ error: "Code requis." });
    }
    if (code !== ADMIN_ACCESS_CODE) {
        return res.status(401).json({ error: "Code invalide." });
    }
    const token = (0, admin_auth_1.issueAdminSessionToken)();
    const cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; ${(0, admin_auth_1.getAdminCookieOptions)()}`;
    res.setHeader("Set-Cookie", cookie);
    return res.json({ authenticated: true });
}
async function getAdminSession(req, res) {
    return res.json({ authenticated: (0, admin_auth_1.isAdminAuthed)(req) });
}
async function logoutAdmin(req, res) {
    clearCookie(res);
    return res.json({ authenticated: false });
}
//# sourceMappingURL=admin.controller.js.map