import { Secret } from "jsonwebtoken";
import { IActivationToken } from "../@types/user";
import jwt from "jsonwebtoken";
export const createActivationToken = (user: any): IActivationToken => {
	const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

	const token = jwt.sign(
		{ user, activationCode },
		process.env.ACTIVATION_SECRET as Secret,
		{ expiresIn: "60m" }
	);

	return { token, activationCode };
};
