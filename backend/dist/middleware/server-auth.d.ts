import type { NextFunction, Request, Response } from "express";
export declare function loginServer(req: Request, res: Response): Response<any, Record<string, any>>;
export declare function getServerSession(req: Request, res: Response): Response<any, Record<string, any>>;
export declare function requireServerAuth(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
//# sourceMappingURL=server-auth.d.ts.map