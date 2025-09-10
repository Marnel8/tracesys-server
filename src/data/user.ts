import { CreateUserParams } from "@/@types/user";
import sequelize from "@/db";
import User, { UserRole } from "@/db/models/user";
import { BadRequestError, ConflictError, NotFoundError } from "@/utils/error";
import { deleteFromCloudinary, extractKeyFromUrl } from "@/utils/cloudinary-uploader";

export const findUserByID = async (id: string) => {
	const user = await User.findByPk(id);

	if (!user) throw new NotFoundError("User not found.");

	return user;
};

export const createUserData = async (userData: CreateUserParams) => {
	const t = await sequelize.transaction();
	
	// Handle avatar - ensure it's a string (Cloudinary URL or empty string)
	const avatar = userData?.avatar || "";
	
	try {
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
				avatar: avatar,
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
	} catch (error) {
		await t.rollback();
		
		// If user creation failed and we have an avatar, clean it up from Cloudinary
		if (avatar) {
			try {
				const avatarKey = extractKeyFromUrl(avatar);
				if (avatarKey) {
					await deleteFromCloudinary(avatarKey);
				}
			} catch (cleanupError) {
				console.error("Failed to cleanup avatar from Cloudinary during user creation failure:", cleanupError);
				// Don't throw here as the main error is more important
			}
		}
		
		throw error;
	}
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

export const updateUserData = async (id: string, userData: Partial<CreateUserParams>) => {
	const t = await sequelize.transaction();
	
	const user = await User.findByPk(id);
	if (!user) {
		await t.rollback();
		throw new NotFoundError("User not found.");
	}

	// Check if email is being updated and if it already exists
	if (userData.email && userData.email !== user.email) {
		const existingUser = await User.findOne({
			where: { email: userData.email },
		});
		if (existingUser) {
			await t.rollback();
			throw new ConflictError("Email already exists.");
		}
	}

	// Check if studentId is being updated and if it already exists
	if (userData.studentId && userData.studentId !== user.studentId) {
		const existingStudent = await User.findOne({
			where: { studentId: userData.studentId },
		});
		if (existingStudent) {
			await t.rollback();
			throw new ConflictError("Student ID already exists.");
		}
	}

	// Check if instructorId is being updated and if it already exists
	if (userData.instructorId && userData.instructorId !== user.instructorId) {
		const existingInstructor = await User.findOne({
			where: { instructorId: userData.instructorId },
		});
		if (existingInstructor) {
			await t.rollback();
			throw new ConflictError("Instructor ID already exists.");
		}
	}

	// Handle avatar update - delete old avatar from Cloudinary if new one is provided
	let oldAvatarKey: string | null = null;
	if (userData.avatar !== undefined && userData.avatar !== user.avatar) {
		// Extract the public key from the old avatar URL if it exists
		if (user.avatar) {
			oldAvatarKey = extractKeyFromUrl(user.avatar);
		}
	}

	// Update user fields
	const updatedUser = await user.update(
		{
			...(userData.firstName && { firstName: userData.firstName }),
			...(userData.lastName && { lastName: userData.lastName }),
			...(userData.middleName !== undefined && { middleName: userData.middleName }),
			...(userData.email && { email: userData.email }),
			...(userData.contactNumber && { contactNumber: userData.contactNumber }),
			...(userData.age !== undefined && { age: userData.age }),
			...(userData.gender && { gender: userData.gender }),
			...(userData.avatar !== undefined && { avatar: userData.avatar }),
			...(userData.address !== undefined && { address: userData.address }),
			...(userData.bio !== undefined && { bio: userData.bio }),
			...(userData.studentId !== undefined && { studentId: userData.studentId }),
			...(userData.instructorId !== undefined && { instructorId: userData.instructorId }),
			...(userData.role && { role: userData.role }),
			...(userData.password && { password: userData.password }),
		},
		{ transaction: t }
	);

	await t.commit();

	// Delete old avatar from Cloudinary after successful update
	if (oldAvatarKey) {
		try {
			await deleteFromCloudinary(oldAvatarKey);
		} catch (error) {
			console.error("Failed to delete old avatar from Cloudinary:", error);
			// Don't throw error here as the user update was successful
		}
	}

	return updatedUser;
};

export const changePasswordData = async (userId: string, currentPassword: string, newPassword: string) => {
	const t = await sequelize.transaction();
	
	try {
		console.log("Looking for user with ID:", userId);
		const user = await User.findByPk(userId);
		console.log("Found user:", user ? "Yes" : "No");
		if (!user) {
			await t.rollback();
			throw new NotFoundError("User not found.");
		}

		// Verify current password
		const isCurrentPasswordValid = await user.comparePassword(currentPassword);
		if (!isCurrentPasswordValid) {
			await t.rollback();
			throw new BadRequestError("Current password is incorrect");
		}

		// Update password
		user.password = newPassword;
		await user.save({ transaction: t });

		await t.commit();
		return user;
	} catch (error) {
		await t.rollback();
		throw error;
	}
};