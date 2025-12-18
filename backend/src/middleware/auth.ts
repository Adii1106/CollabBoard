import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "super-secret-key";

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
    };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next(); // Proceed without user (optional auth), or block? keeping it optional to match sessionController logic which checked userId existence
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return next();
    }

    try {
        const payload = jwt.verify(token, SECRET) as any;
        (req as AuthRequest).user = {
            id: payload.id,
            username: payload.username,
        };
        next();
    } catch (err) {
        // If token invalid, proceed without identifying user
        next();
    }
}
