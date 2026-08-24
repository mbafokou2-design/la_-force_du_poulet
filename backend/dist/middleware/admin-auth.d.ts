import type { NextFunction, Request, Response } from "express";
export declare function parseCookies(cookieHeader: string | undefined): Record<string, string>;
export declare function issueAdminSessionToken(now?: number): string;
export declare function verifyAdminSessionToken(token: string | undefined, now?: number): boolean;
export declare function getAdminCookieOptions(maxAgeMs?: number): string;
export declare function requireAdminAuth(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function isAdminAuthed(req: Request): boolean;
export declare const adminAuthConstants: {
    ADMIN_ACCESS_CODE: string;
    COOKIE_NAME: string;
};
//# sourceMappingURL=admin-auth.d.ts.map