import { Response } from "express";
import "dotenv/config";
import User from "@/db/models/user";

interface CookieOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  secure: boolean;
  path: string;
  domain?: string; // Optional - undefined allows cookies on current domain (localhost in dev)
}

const API_DOMAIN = "tracesys-api.mvsoftwares.space";

/**
 * Returns correct cookie options for cross-domain authentication
 */
const getCookieOptions = (maxAge: number): CookieOptions => {
  const isProd = process.env.NODE_ENV === "production";

  // For cross-subdomain cookie sharing, use the parent domain with a leading dot
  // This makes cookies accessible on all subdomains (tracesys.mvsoftwares.space, tracesys-api.mvsoftwares.space, etc.)
  // In development, don't set domain (or use localhost) to allow local development
  const cookieDomain = isProd
    ? ".mvsoftwares.space" // Leading dot makes it accessible to all subdomains
    : undefined; // In development, don't set domain to allow localhost

  return {
    expires: new Date(Date.now() + maxAge),
    maxAge,
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd, // MUST be true in production
    path: "/", // REQUIRED for cross-site cookies
    // Only set domain in production - in dev, undefined allows localhost
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  };
};

/**
 * Access token cookie (1 hour)
 */
export const getAccessTokenOptions = (): CookieOptions => {
  return getCookieOptions(60 * 60 * 1000); // 1 hour
};

/**
 * Refresh token cookie (3 days)
 */
export const getRefreshTokenOptions = (): CookieOptions => {
  return getCookieOptions(3 * 24 * 60 * 60 * 1000); // 3 days
};

/**
 * Creates signed JWTs from the user model
 */
export const createAuthTokens = (user: User) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();
  return { accessToken, refreshToken };
};

/**
 * Sends access + refresh token cookies to the browser
 */
export const sendToken = (user: User, statusCode: number, res: Response) => {
  const { accessToken, refreshToken } = createAuthTokens(user);

  const accessOptions = getAccessTokenOptions();
  const refreshOptions = getRefreshTokenOptions();

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
