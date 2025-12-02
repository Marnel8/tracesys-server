"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToken = exports.createAuthTokens = exports.getRefreshTokenOptions = exports.getAccessTokenOptions = void 0;
require("dotenv/config");
// Helper function to get cookie options with proper configuration
const getCookieOptions = (maxAge) => {
    const options = {
        expires: new Date(Date.now() + maxAge),
        maxAge,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    };
    // In production, SameSite=None cookies MUST also be Secure or
    // modern browsers (Chrome, etc.) will silently reject them.
    if (process.env.NODE_ENV === "production") {
        options.secure = true;
    }
    // Debug logging for cookie options
    console.log("[JWT] Cookie options:", {
        sameSite: options.sameSite,
        secure: options.secure,
        maxAge: `${maxAge / 1000}s`,
        httpOnly: options.httpOnly,
        env: process.env.NODE_ENV,
    });
    return options;
};
// Get cookie options (recreated each time to avoid mutation issues)
const getAccessTokenOptions = () => {
    return getCookieOptions(60 * 60 * 1000); // 1 hour
};
exports.getAccessTokenOptions = getAccessTokenOptions;
const getRefreshTokenOptions = () => {
    return getCookieOptions(3 * 24 * 60 * 60 * 1000); // 3 days
};
exports.getRefreshTokenOptions = getRefreshTokenOptions;
const createAuthTokens = (user) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();
    return { accessToken, refreshToken };
};
exports.createAuthTokens = createAuthTokens;
const sendToken = (user, statusCode, res) => {
    const { accessToken, refreshToken } = (0, exports.createAuthTokens)(user);
    // Use getter functions to ensure fresh options with correct configuration
    const accessOptions = (0, exports.getAccessTokenOptions)();
    const refreshOptions = (0, exports.getRefreshTokenOptions)();
    // Debug logging
    console.log("[JWT] Setting cookies for user:", {
        userId: user.id,
        email: user.email,
        accessTokenLength: accessToken.length,
        refreshTokenLength: refreshToken.length,
        accessOptions: {
            sameSite: accessOptions.sameSite,
            secure: accessOptions.secure,
            maxAge: `${accessOptions.maxAge / 1000}s`,
            path: "/",
        },
        env: process.env.NODE_ENV,
    });
    res.cookie("access_token", accessToken, accessOptions);
    res.cookie("refresh_token", refreshToken, refreshOptions);
    res.status(statusCode).json({
        success: true,
        user,
        accessToken,
    });
};
exports.sendToken = sendToken;
