import {HttpStatusCode} from '../constants/HttpCode';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;

  constructor(message: string, statusCode: number, errorCode: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  getStatusCode(): number {
    return this.statusCode;
  }

  getErrorCode(): string {
    return this.errorCode;
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      message: this.message,
      errorCode: this.errorCode,
     
    };
  }

  send() {
    return this.toJSON();
  }
}


export class ApiErrorFactory {
    static createError(type:string, message?:string): ApiError {
        switch(type) {
            case 'NOT_FOUND':
                return  new NotFoundError(message || 'Resource Not Found');
            case 'BAD_REQUEST':
                return new BadRequestError(message || 'Bad Request');
            case 'UNAUTHORIZED':
                return new UnauthorizedError(message || 'Unauthorized');
            case 'FORBIDDEN':
                return new ForbiddenError(message || 'Forbidden');
            case 'INTERNAL_SERVER_ERROR':
                return new InternalServerError(message || 'Internal Server Error');
            case 'UNPROCESSABLE_ENTITY':
                return new UnprocessableEntityError(message || 'Unprocessable Entity');
            case 'TOO_MANY_REQUESTS':
                return new TooManyRequestsError(message || 'Too Many Requests');
            case 'CONFLICT':
                return new ConflictError(message || 'Conflict');            
            default:
                return new InternalServerError(message || 'Internal Server Error'); 

        }
    }
}

export class NotFoundError extends ApiError {
    constructor(message: string) {
        super(message, HttpStatusCode.NOT_FOUND, 'NOT_FOUND');
    }
}

export class BadRequestError extends ApiError {
    constructor(message: string) {
        super(message, HttpStatusCode.BAD_REQUEST, 'BAD_REQUEST');
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string) {
        super(message, HttpStatusCode.UNAUTHORIZED, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends ApiError {
    constructor(message: string) {
        super(message, HttpStatusCode.FORBIDDEN, 'FORBIDDEN');
    }
}

export class InternalServerError extends ApiError {
    constructor(message: string) {
        super(message, HttpStatusCode.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR');
    }
}

export class UnprocessableEntityError extends ApiError {
    constructor(message: string) {
        super(message, HttpStatusCode.UNPROCESSABLE_ENTITY, 'UNPROCESSABLE_ENTITY');
    }
}

export class TooManyRequestsError extends ApiError {
    constructor(message: string) {
        super(message, HttpStatusCode.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS');
    }
}

export class ConflictError extends ApiError {
    constructor(message: string) {
        super(message, HttpStatusCode.CONFLICT, 'CONFLICT');
    }
}       
