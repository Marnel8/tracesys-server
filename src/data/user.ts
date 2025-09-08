import { CreateUserParams } from "@/@types/user";
import sequelize from "@/db";
import User, { UserRole } from "@/db/models/user";
import { BadRequestError, ConflictError, NotFoundError } from "@/utils/error";

export const findUserByID = async (id: string) => {
	const user = await User.findByPk(id);

	if (!user) throw new NotFoundError("User not found.");

	return user;
};

export const createUserData = async (userData: CreateUserParams) => {
	const t = await sequelize.transaction();
	const user = await User.create(
		{
			firstName: userData.firstName,
			lastName: userData.lastName,
			middleName: userData.middleName,
			contactNumber: userData.contactNumber,
			email: userData.email,
			password: userData.password,
			age: userData?.age as number,
			gender: userData.gender,
			avatar: userData?.avatar || "",
			address: userData?.address,
			bio: userData?.bio,
			studentId: userData?.studentId,
			instructorId: userData?.instructorId,
			role: userData?.role ?? UserRole.USER,
		},
		{ transaction: t }
	);

	if (!user) {
		await t.rollback();
		throw new ConflictError("Failed to create user.");
	}

	await t.commit();

	return user;
};

export const login = async ({
	email,
	password,
}: {
	email: string;
	password: string;
}) => {
	const user = await User.findOne({
		where: {
			email,
		},
	});

	if (!user) {
		throw new NotFoundError("User not found.");
	}

	const isPasswordMatch = await user.comparePassword(password);

	if (!isPasswordMatch) throw new BadRequestError("Invalid Credentials.");

	return user;
};
