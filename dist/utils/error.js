"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = void 0;
exports.makeError = makeError;
const http_status_codes_1 = require("http-status-codes");
class BadRequestError extends Error {
    constructor(message) {
        super(message);
        this.name = "BadRequestError";
        this.message = message;
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends Error {
    constructor(message) {
        super(message);
        this.name = "UnauthorizedError";
        this.message = message;
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends Error {
    constructor(message) {
        super(message);
        this.name = "ForbiddenError";
        this.message = message;
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = "NotFoundError";
        this.message = message;
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = "ConflictError";
        this.message = message;
    }
}
exports.ConflictError = ConflictError;
function makeError(error) {
    const defaultError = {
        name: error.name,
        message: error.message,
    };
    /* Custom Errors */
    if (error.message.includes("Malformed JSON")) {
        return {
            statusCode: http_status_codes_1.StatusCodes.BAD_REQUEST,
            error: { name: "BadRequestError", message: error.message },
        };
    }
    if (error instanceof BadRequestError) {
        return {
            statusCode: http_status_codes_1.StatusCodes.BAD_REQUEST,
            error: defaultError,
        };
    }
    if (error instanceof UnauthorizedError) {
        return {
            statusCode: http_status_codes_1.StatusCodes.UNAUTHORIZED,
            error: defaultError,
        };
    }
    if (error instanceof ForbiddenError) {
        return {
            statusCode: http_status_codes_1.StatusCodes.FORBIDDEN,
            error: defaultError,
        };
    }
    if (error instanceof NotFoundError) {
        return {
            statusCode: http_status_codes_1.StatusCodes.NOT_FOUND,
            error: defaultError,
        };
    }
    if (error instanceof ConflictError) {
        return {
            statusCode: http_status_codes_1.StatusCodes.CONFLICT,
            error: defaultError,
        };
    }
    return {
        statusCode: http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR,
        error: defaultError,
    };
}
