"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("../utils/error.js");
const errorHandlerMiddleware = (err, req, res, next) => {
    const { error, statusCode } = (0, error_1.makeError)(err);
    console.error(error.message, error);
    res.status(statusCode).json(error);
};
exports.default = errorHandlerMiddleware;
