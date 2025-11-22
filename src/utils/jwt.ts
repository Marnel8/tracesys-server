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

// Update the options to use the new type
export const accessTokenOptions: CookieOptions = {
	expires: new Date(Date.now() + 60 * 60 * 1000),
	maxAge: 60 * 60 * 1000,
	httpOnly: true,
	sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

export const refreshTokenOptions: CookieOptions = {
	expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
	maxAge: 3 * 24 * 60 * 60 * 1000,
	httpOnly: true,
	sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

export const createAuthTokens = (user: User) => {
	const accessToken = user.SignAccessToken();
	const refreshToken = user.SignRefreshToken();
	return { accessToken, refreshToken };
};

export const sendToken = (user: User, statusCode: number, res: Response) => {
	const { accessToken, refreshToken } = createAuthTokens(user);

	if (process.env.NODE_ENV === "production") {
		accessTokenOptions.secure = true;
		refreshTokenOptions.secure = true;
	}

	res.cookie("access_token", accessToken, accessTokenOptions);
	res.cookie("refresh_token", refreshToken, refreshTokenOptions);

	res.status(statusCode).json({
		success: true,
		user,
		accessToken,
	});
};
