import { Response } from "express";
import "dotenv/config";
import User from "@/db/models/user";

interface CookieOptions {
	expires: Date;
	maxAge: number;
	httpOnly: boolean;
	sameSite: "lax" | "strict" | "none";
	secure?: boolean;
	domain?: string;
	path?: string;
}

// Helper function to get cookie options with proper configuration
const getCookieOptions = (maxAge: number): CookieOptions => {
	const isProd = process.env.NODE_ENV === "production";
	const sameSite = isProd ? "none" : "lax";
	
	// When sameSite is "none", secure MUST be true (browser requirement)
	const secure = isProd ? true : false;
	
	const options: CookieOptions = {
		expires: new Date(Date.now() + maxAge),
		maxAge,
		httpOnly: true,
		sameSite,
		secure,
		path: "/", // Explicitly set path to root to ensure cookies are accessible across all routes
	};
	
	// Set domain only if explicitly configured and not localhost
	const cookieDomain = process.env.COOKIE_DOMAIN;
	if (cookieDomain && cookieDomain !== "localhost" && !cookieDomain.startsWith("127.0.0.1")) {
		options.domain = cookieDomain;
	}
	
	// Debug logging for cookie options (in development)
	if (process.env.NODE_ENV !== "production") {
		console.log("[JWT] Cookie options:", {
			sameSite,
			secure,
			domain: options.domain || "not set",
			maxAge: `${maxAge / 1000}s`,
			httpOnly: true,
		});
	}
	
	return options;
};

// Get cookie options (recreated each time to avoid mutation issues)
export const getAccessTokenOptions = (): CookieOptions => {
	return getCookieOptions(60 * 60 * 1000); // 1 hour
};

export const getRefreshTokenOptions = (): CookieOptions => {
	return getCookieOptions(3 * 24 * 60 * 60 * 1000); // 3 days
};

// Legacy exports for backward compatibility (will be updated to use getters)
export const accessTokenOptions: CookieOptions = getAccessTokenOptions();
export const refreshTokenOptions: CookieOptions = getRefreshTokenOptions();

export const createAuthTokens = (user: User) => {
	const accessToken = user.SignAccessToken();
	const refreshToken = user.SignRefreshToken();
	return { accessToken, refreshToken };
};

export const sendToken = (user: User, statusCode: number, res: Response) => {
	const { accessToken, refreshToken } = createAuthTokens(user);

	// Use getter functions to ensure fresh options with correct configuration
	const accessOptions = getAccessTokenOptions();
	const refreshOptions = getRefreshTokenOptions();

	// Debug logging (in development)
	if (process.env.NODE_ENV !== "production") {
		console.log("[JWT] Setting cookies for user:", {
			userId: user.id,
			email: user.email,
			accessTokenLength: accessToken.length,
			refreshTokenLength: refreshToken.length,
			accessOptions: {
				sameSite: accessOptions.sameSite,
				secure: accessOptions.secure,
				domain: accessOptions.domain || "not set",
				maxAge: `${accessOptions.maxAge / 1000}s`,
			},
		});
	}

	res.cookie("access_token", accessToken, accessOptions);
	res.cookie("refresh_token", refreshToken, refreshOptions);

	res.status(statusCode).json({
		success: true,
		user,
		accessToken,
	});
};
