import { Response } from "express";
import "dotenv/config";
import User from "@/db/models/user";

interface CookieOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  secure?: boolean;
}
// Helper function to get cookie options with proper configuration
const getCookieOptions = (maxAge: number): CookieOptions => {
  const options: CookieOptions = {
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
export const getAccessTokenOptions = (): CookieOptions => {
  return getCookieOptions(60 * 60 * 1000); // 1 hour
};

export const getRefreshTokenOptions = (): CookieOptions => {
  return getCookieOptions(3 * 24 * 60 * 60 * 1000); // 3 days
};

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
