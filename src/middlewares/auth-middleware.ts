import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// Extend Express Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers["authorization"]?.split(" ")[1];
  const decoded = jwt.verify(header || "", JWT_SECRET);
  if (decoded && typeof decoded === "object" && "id" in decoded) {
    req.userId = (decoded as jwt.JwtPayload).id as string;
    next();
  } else {
    return res.status(403).json({ message: "You are not authorized" });
  }
};
