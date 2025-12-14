import { Gender, UserRole } from "@/db/models/user";

export interface IUser {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	age: number;
	phone: string;
	password: string;
	role?: UserRole;
	comparePassword: (password: string) => Promise<boolean>;
	SignAccessToken: () => string;
	SignRefreshToken: () => string;
}

export type CreateUserParams = {
	firstName: string;
	lastName: string;
	middleName?: string;
	email: string;
	age?: number;
	phone: string;
	role?: UserRole;
	password: string;
	gender: Gender;
	avatar?: string | undefined;
	address?: string;
	bio?: string;
	studentId?: string;
	instructorId?: string;
	departmentId?: string;
	program?: string;
	specialization?: string;
	yearLevel?: string;
};

export type FindUserParams = {
	email: string;
};

export type IActivationToken = {
	token: string;
	activationCode: string;
};

export type IActivationRequest = {
	activation_token: string;
	activation_code: string;
};
