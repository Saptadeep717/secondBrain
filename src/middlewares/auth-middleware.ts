import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { wrapAsync } from "../utils/AsyncHandler";
import { ApiErrorFactory } from "../utils/ApiError";
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// Extend Express Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authMiddleware = wrapAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      throw ApiErrorFactory.createError(
        "UNAUTHORIZED",
        "Authorization header missing"
      );
    }

    const token = authHeader.split(" ")[1]; // Bearer <token>
    if (!token) {
      throw ApiErrorFactory.createError("UNAUTHORIZED", "Token missing");
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded && typeof decoded === "object" && "id" in decoded) {
      req.userId = (decoded as jwt.JwtPayload).id as string;
      next();
    } else {
      throw ApiErrorFactory.createError(
        "UNAUTHORIZED",
        "Invalid token payload"
      );
    }
  }
);
