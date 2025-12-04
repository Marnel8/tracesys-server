"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToken = exports.createAuthTokens = exports.getRefreshTokenOptions = exports.getAccessTokenOptions = void 0;
require("dotenv/config");
const API_DOMAIN = "tracesys-api.mvsoftwares.space";
/**
 * Returns correct cookie options for cross-domain authentication
 */
const getCookieOptions = (maxAge) => {
    const isProd = process.env.NODE_ENV === "production";
    return {
        expires: new Date(Date.now() + maxAge),
        maxAge,
        httpOnly: true,
        sameSite: isProd ? "none" : "lax",
        secure: isProd, // MUST be true in production
        path: "/", // REQUIRED for cross-site cookies
        domain: API_DOMAIN, // REQUIRED for cross-domain persistence
    };
};
/**
 * Access token cookie (1 hour)
 */
const getAccessTokenOptions = () => {
    return getCookieOptions(60 * 60 * 1000); // 1 hour
};
exports.getAccessTokenOptions = getAccessTokenOptions;
/**
 * Refresh token cookie (3 days)
 */
const getRefreshTokenOptions = () => {
    return getCookieOptions(3 * 24 * 60 * 60 * 1000); // 3 days
};
exports.getRefreshTokenOptions = getRefreshTokenOptions;
/**
 * Creates signed JWTs from the user model
 */
const createAuthTokens = (user) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();
    return { accessToken, refreshToken };
};
exports.createAuthTokens = createAuthTokens;
/**
 * Sends access + refresh token cookies to the browser
 */
const sendToken = (user, statusCode, res) => {
    const { accessToken, refreshToken } = (0, exports.createAuthTokens)(user);
    const accessOptions = (0, exports.getAccessTokenOptions)();
    const refreshOptions = (0, exports.getRefreshTokenOptions)();
    // Debug logs (optional)
    console.log("[AUTH] Setting cookies:", {
        access: {
            sameSite: accessOptions.sameSite,
            secure: accessOptions.secure,
            domain: accessOptions.domain,
            path: accessOptions.path,
            maxAge: accessOptions.maxAge,
        },
        refresh: {
            sameSite: refreshOptions.sameSite,
            secure: refreshOptions.secure,
            domain: refreshOptions.domain,
            path: refreshOptions.path,
            maxAge: refreshOptions.maxAge,
        },
        env: process.env.NODE_ENV,
    });
    // Set cookies
    res.cookie("access_token", accessToken, accessOptions);
    res.cookie("refresh_token", refreshToken, refreshOptions);
    // Response
    return res.status(statusCode).json({
        success: true,
        user,
        accessToken,
    });
};
exports.sendToken = sendToken;
