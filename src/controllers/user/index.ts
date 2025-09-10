import { Request, Response } from "express";
import path from "path";
import fs from "fs";

import jwt, { JwtPayload } from "jsonwebtoken";
import sendMail from "@/utils/send-mail";
import { createActivationToken } from "@/services/user";
import User from "@/db/models/user";
import { IActivationRequest, CreateUserParams } from "@/@types/user";
import { StatusCodes } from "http-status-codes";
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
	UnauthorizedError,
} from "@/utils/error";
import { createUserData, findUserByID, login, updateUserData, changePasswordData } from "@/data/user";
import {
	accessTokenOptions,
	refreshTokenOptions,
	sendToken,
} from "@/utils/jwt";
import { uploadUserAvatarUpdate, uploadUserAvatar } from "@/utils/image-handler";
// Simple in-memory reset store (email -> { code, expiresAt })
const passwordResetStore: Map<string, { code: string; expiresAt: number }> = new Map();

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

	// Handle avatar upload if provided - use Cloudinary URL if available
	const avatar = req.cloudUrls && req.cloudUrls.length > 0 ? req.cloudUrls[0] : "";

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

export const forgotPasswordController = async (req: Request, res: Response) => {
	const { email } = req.body as { email?: string };

	if (!email) {
		throw new BadRequestError("Email is required");
	}

	const user = await User.findOne({ where: { email } });

	// Do not reveal whether user exists
	if (!user) {
		res.status(StatusCodes.OK).json({ success: true, message: "If the email exists, a code has been sent" });
		return;
	}

	const code = Math.floor(1000 + Math.random() * 9000).toString();
	const expiresAt = Date.now() + 15 * 60 * 1000;
	passwordResetStore.set(email, { code, expiresAt });

	const projectRoot = process.cwd();
	const candidateAssetDirs = [
		path.join(projectRoot, "assets"),
		path.join(projectRoot, "src", "assets"),
		path.join(projectRoot, "dist", "assets"),
	];
	const assetsDir = candidateAssetDirs.find((p) => fs.existsSync(p)) || candidateAssetDirs[0];

	await sendMail({
		email,
		subject: "Reset your password",
		template: "activation-mail.ejs",
		data: { user, activationCode: code },
		attachments: [
			{
				filename: "logo.png",
				path: path.join(assetsDir, "logo.png"),
				cid: "logo",
			},
		],
	});

	res.status(StatusCodes.OK).json({ success: true, message: "Verification code sent" });
};

export const resetPasswordController = async (req: Request, res: Response) => {
	const { email, activation_code, password } = req.body as {
		email?: string;
		activation_code?: string;
		password?: string;
	};

	if (!email || !activation_code || !password) {
		throw new BadRequestError("Email, code and new password are required");
	}

	const entry = passwordResetStore.get(email);
	if (!entry) {
		throw new BadRequestError("Invalid or expired code");
	}

	if (Date.now() > entry.expiresAt) {
		passwordResetStore.delete(email);
		throw new BadRequestError("Code expired");
	}

	if (entry.code !== activation_code) {
		throw new BadRequestError("Invalid code");
	}

	const user = await User.findOne({ where: { email } });
	if (!user) {
		throw new NotFoundError("User not found");
	}

	user.password = password;
	await user.save();

	passwordResetStore.delete(email);

	res.status(StatusCodes.OK).json({ success: true, message: "Password has been reset" });
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

export const editUserController = async (req: Request, res: Response) => {
	const { id } = req.params;
	const {
		firstName,
		lastName,
		middleName,
		email,
		contactNumber,
		age,
		gender,
		address,
		bio,
		studentId,
		instructorId,
		role,
		password,
	} = req.body;

	if (!id) {
		throw new BadRequestError("User ID is required.");
	}

	// Handle avatar upload if provided - use Cloudinary URL if available
	const avatar = req.cloudUrls && req.cloudUrls.length > 0 ? req.cloudUrls[0] : undefined;

	const updateData: Partial<CreateUserParams> = {
		...(firstName && { firstName }),
		...(lastName && { lastName }),
		...(middleName !== undefined && { middleName }),
		...(email && { email }),
		...(contactNumber && { contactNumber }),
		...(age !== undefined && { age }),
		...(gender && { gender }),
		...(address !== undefined && { address }),
		...(bio !== undefined && { bio }),
		...(studentId !== undefined && { studentId }),
		...(instructorId !== undefined && { instructorId }),
		...(role && { role }),
		...(password && { password }),
		...(avatar && { avatar }),
	};

	const updatedUser = await updateUserData(id, updateData);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "User updated successfully",
		user: updatedUser,
	});
};

export const changePasswordController = async (req: Request, res: Response) => {
	const { currentPassword, newPassword } = req.body as {
		currentPassword?: string;
		newPassword?: string;
	};

	if (!currentPassword || !newPassword) {
		throw new BadRequestError("Current password and new password are required");
	}

	if (newPassword.length < 6) {
		throw new BadRequestError("New password must be at least 6 characters long");
	}

	// Get user ID from authenticated user (set by auth middleware)
	console.log("req.user:", req.user);
	console.log("req.user?.id:", req.user?.id);
	const userId = req.user?.id;
	if (!userId) {
		throw new UnauthorizedError("User not authenticated");
	}

	await changePasswordData(userId, currentPassword, newPassword);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Password changed successfully",
	});
};
