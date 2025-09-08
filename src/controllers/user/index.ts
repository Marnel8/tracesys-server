import { Request, Response } from "express";
import path from "path";
import fs from "fs";

import jwt, { JwtPayload } from "jsonwebtoken";
import sendMail from "@/utils/send-mail";
import { createActivationToken } from "@/services/user";
import User from "@/db/models/user";
import { IActivationRequest } from "@/@types/user";
import { StatusCodes } from "http-status-codes";
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
	UnauthorizedError,
} from "@/utils/error";
import { createUserData, findUserByID, login } from "@/data/user";
import {
	accessTokenOptions,
	refreshTokenOptions,
	sendToken,
} from "@/utils/jwt";

export const registerUserController = async (req: Request, res: Response) => {
	const {
		firstName,
		lastName,
		email,
		password,
		role,
		gender,
		age,
		contactNumber,
		middleName,
		address,
		bio,
		studentId,
		instructorId,
	} = req.body;

	if (!firstName || !lastName || !email || !password) {
		throw new BadRequestError("Please provide all necessary data.");
	}

	const avatar = req.file?.filename;

	const user = {
		firstName,
		lastName,
		email,
		password,
		age,
		role,
		gender,
		contactNumber,
		middleName,
		address,
		bio,
		studentId,
		instructorId,
		avatar,
	};

	const activationToken = createActivationToken(user);
	const activationCode = activationToken.activationCode;
	const data = { user, activationCode };

	const projectRoot = process.cwd();
	const candidateAssetDirs = [
		path.join(projectRoot, "assets"),
		path.join(projectRoot, "src", "assets"),
		path.join(projectRoot, "dist", "assets"),
	];
	const assetsDir = candidateAssetDirs.find((p) => fs.existsSync(p)) || candidateAssetDirs[0];

	await sendMail({
		email: user.email,
		subject: "Activate your account",
		template: "activation-mail.ejs",
		data,
		attachments: [
			{
				filename: "logo.png",
				path: path.join(assetsDir, "logo.png"),
				cid: "logo",
			},
		],
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: `Please check your email: ${user.email} to activate your account`,
		activationToken: activationToken.token,
	});
};

export const activateUserController = async (req: Request, res: Response) => {
	const { activation_token, activation_code } = req.body as IActivationRequest;

	const newUser: { user: User; activationCode: string } = jwt.verify(
		activation_token,
		process.env.ACTIVATION_SECRET as string
	) as { user: User; activationCode: string };

	if (newUser.activationCode !== activation_code) {
		throw new BadRequestError("Activation code did not match.");
	}

	const {
		firstName,
		lastName,
		middleName,
		contactNumber,
		email,
		age,
		password,
		gender,
		avatar,
		role,
		address,
		bio,
		studentId,
		instructorId,
	} = newUser.user as any;

	const user = await createUserData({
		firstName,
		lastName,
		contactNumber,
		middleName,
		email,
		password,
		age,
		gender,
		avatar,
		role,
		address,
		bio,
		studentId,
		instructorId,
	});

	res.status(StatusCodes.CREATED).json(user);
};

export const loginController = async (req: Request, res: Response) => {
	const { email, password } = req.body;

	const userResult = await login({ email, password });

	sendToken(userResult, StatusCodes.OK, res);
};

export const getUserDetailsController = async (req: Request, res: Response) => {
	const { access_token } = req.cookies;

	if (!access_token) {
		throw new UnauthorizedError("No token provided");
	}

	const decoded = jwt.verify(
		access_token,
		process.env.ACCESS_TOKEN_SECRET as string
	) as JwtPayload;

	if (!decoded) throw new UnauthorizedError("Invalid token");

	const user = await findUserByID(decoded.id);

	if (!user) {
		throw new NotFoundError("User not found.");
	}

	res.status(StatusCodes.OK).json(user);
};

export const refreshTokenController = async (req: Request, res: Response) => {
	const refresh_token = req.cookies.refresh_token as string;

	if (!refresh_token) {
		throw new UnauthorizedError("Refresh token not provided");
	}

	let decoded: JwtPayload;

	try {
		decoded = jwt.verify(
			refresh_token,
			process.env.REFRESH_TOKEN_SECRET as string
		) as JwtPayload;
	} catch (error) {
		throw new UnauthorizedError("Invalid or expired refresh token");
	}

	const userSession = await findUserByID(decoded.id);

	if (!userSession) {
		throw new NotFoundError("User not found.");
	}

	const accessToken = jwt.sign(
		{ id: userSession.id },
		process.env.ACCESS_TOKEN_SECRET as string,
		{
			expiresIn: "1h",
		}
	);

	const refreshToken = jwt.sign(
		{ id: userSession.id },
		process.env.REFRESH_TOKEN_SECRET as string,
		{
			expiresIn: "3d",
		}
	);

	req.user = userSession;

	res.cookie("access_token", accessToken, accessTokenOptions);
	res.cookie("refresh_token", refreshToken, refreshTokenOptions);

	res.status(StatusCodes.OK).json({ success: true });
};

export const logoutController = async (req: Request, res: Response) => {
	try {
		res.clearCookie("access_token");
		res.clearCookie("refresh_token");

		res.status(StatusCodes.OK).json({
			success: true,
			message: "Logged out succesfully",
		});
	} catch (error) {
		throw new ConflictError("Something went wrong.");
	}
};
