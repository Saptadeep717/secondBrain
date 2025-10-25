import { Request, Response, NextFunction, RequestHandler } from "express";

export const wrapAsync = (fn: RequestHandler) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      //Promise.resolve to handle both sync and async functions.make sync code also work  
      await Promise.resolve(fn(req, res, next));
    } catch (err) {
      next(err);
    }
  };
};