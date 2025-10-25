import { Request, Response, NextFunction } from "express";
import { ApiErrorFactory, ApiError } from "../utils/ApiError";
import mongoose from "mongoose";
const isApiError = (err: any): err is ApiError => {
  return err instanceof ApiError;
};

const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  
  // If it's an ApiError, use its status and payload
  if (isApiError(err)) {
    return res.status(err.getStatusCode()).json(err.send());
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string> = {};
    for (const key in err.errors) {
      if (Object.prototype.hasOwnProperty.call(err.errors, key)) {
        // @ts-ignore: mongoose types
        details[key] = err.errors[key].message;
      }
    }
    const apiErr = ApiErrorFactory.createError(
      "UNPROCESSABLE_ENTITY",
      "Validation failed"
    );
    const payload = apiErr.send();
    // attach validation details
    (payload as any).details = details;
    return res.status(apiErr.getStatusCode()).json(payload);
  }

  // Mongoose CastError -> usually invalid ObjectId or bad type -> 400 Bad Request
  if (err instanceof mongoose.Error.CastError) {
    const apiErr = ApiErrorFactory.createError(
      "BAD_REQUEST",
      `Invalid ${err.path}: ${err.value}`
    );
    return res.status(apiErr.getStatusCode()).json(apiErr.send());
  }

  // Mongoose duplicate key (11000) -> 409 Conflict
  // err may be a plain object from Mongo driver
  // @ts-ignore
  if (err && typeof err === "object" && (err as any).code === 11000) {
    // extract duplicated fields for friendliness
    // @ts-ignore
    const key =
      Object.keys((err as any).keyValue || {}).join(", ") || undefined;
    const message = key
      ? `Duplicate value for field(s): ${key}`
      : "Duplicate key error";
    const apiErr = ApiErrorFactory.createError("CONFLICT", message);
    return res.status(apiErr.getStatusCode()).json(apiErr.send());
  }

  // JWT errors (jsonwebtoken)
  // Many JWT libs set `name` on error to 'JsonWebTokenError' or 'TokenExpiredError'
  // @ts-ignore
  if (
    err &&
    typeof err === "object" &&
    (err as any).name === "JsonWebTokenError"
  ) {
    const apiErr = ApiErrorFactory.createError("UNAUTHORIZED", "Invalid token");
    return res.status(apiErr.getStatusCode()).json(apiErr.send());
  }
  // @ts-ignore
  if (
    err &&
    typeof err === "object" &&
    (err as any).name === "TokenExpiredError"
  ) {
    const apiErr = ApiErrorFactory.createError("UNAUTHORIZED", "Token expired");
    return res.status(apiErr.getStatusCode()).json(apiErr.send());
  }

  console.error("Unhandled error:", err);

  const responseBody = {
    statusCode: 500,
    message: "Internal Server Error",
    errorCode: "INTERNAL_SERVER_ERROR",
  };

  return res.status(500).json(responseBody);
};

export default errorHandler;
