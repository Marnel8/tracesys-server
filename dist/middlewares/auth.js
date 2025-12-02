"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.isAuthenticated = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = __importDefault(require("../db/models/user.js"));
require("dotenv/config");
const error_1 = require("../utils/error.js");
// Authenticated Users
const isAuthenticated = async (req, res, next) => {
    const access_token = req?.cookies.access_token;
    if (!access_token) {
        throw new error_1.UnauthorizedError("Please login to access this resource.");
    }
    const decoded = jsonwebtoken_1.default.verify(access_token, process.env.ACCESS_TOKEN_SECRET || "");
    if (!decoded)
        throw new error_1.UnauthorizedError("Invalid token");
    const user = await user_1.default.findOne({ where: { id: decoded.id } });
    if (!user) {
        throw new error_1.NotFoundError("User not found.");
    }
    req.user = user;
    next();
};
exports.isAuthenticated = isAuthenticated;
// Validate user roles
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req?.user.role || "")) {
            throw new error_1.ForbiddenError(`Role: ${req.user?.role} is not allowed to access this resource`);
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
