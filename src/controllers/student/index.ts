import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
} from "@/utils/error";
import { createStudentData, findStudentByID, updateStudentData, deleteStudentData, getStudentsData, getStudentsByTeacherData } from "@/data/student";
import { uploadUserAvatar } from "@/utils/image-handler";
import path from "path";
import fs from "fs";
import sendMail from "@/utils/send-mail";

// Student registration data interface
interface StudentRegistrationData {
	// Personal Information
	firstName: string;
	lastName: string;
	middleName?: string;
	email: string;
	phone: string;
	age: number;
	gender: string;
	avatar?: string;

	// Academic Information
	studentId: string;
	department: string;
	course: string;
	section: string;
	year: string;
	semester: string;

	// Practicum Information
	agency: string;
	agencyAddress: string;
	supervisor: string;
	supervisorEmail: string;
	supervisorPhone: string;
	startDate: string;
	endDate: string;

	// Account Settings
	password: string;
	sendCredentials?: boolean;
}

export const createStudentController = async (req: Request, res: Response) => {
	const {
		firstName,
		lastName,
		middleName,
		email,
		phone,
		age,
		gender,
		studentId,
		department,
		course,
		section,
		year,
		semester,
		agency,
		agencyAddress,
		supervisor,
		supervisorEmail,
		supervisorPhone,
		startDate,
		endDate,
		password,
		sendCredentials = true,
	}: StudentRegistrationData = req.body;

	if (!firstName || !lastName || !email || !phone || !age || !gender || !studentId || !password) {
		throw new BadRequestError("Please provide all necessary data.");
	}

	// Handle avatar upload if provided - use Cloudinary URL if available
	const avatar = req.cloudUrls && req.cloudUrls.length > 0 ? req.cloudUrls[0] : "";

	const studentData = {
		firstName,
		lastName,
		middleName,
		email,
		phone,
		age,
		gender,
		studentId,
		password,
		avatar,
		department,
		course,
		section,
		year,
		semester,
		agency,
		agencyAddress,
		supervisor,
		supervisorEmail,
		supervisorPhone,
		startDate,
		endDate,
		sendCredentials,
	};

	const result = await createStudentData(studentData);

	// Send credentials email if requested
	if (sendCredentials) {
		await sendStudentCredentials(result.user, password);
	}

	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Student created successfully",
		data: result,
	});
};

export const getStudentsController = async (req: Request, res: Response) => {
	const { page = 1, limit = 10, search = "" } = req.query;

	const result = await getStudentsData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		data: result,
	});
};

export const getStudentsByTeacherController = async (req: Request, res: Response) => {
	const { teacherId } = req.params;
	const { page = 1, limit = 10, search = "" } = req.query;

	if (!teacherId) {
		throw new BadRequestError("Teacher ID is required.");
	}

	const result = await getStudentsByTeacherData({
		teacherId,
		page: Number(page),
		limit: Number(limit),
		search: search as string,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		data: result,
	});
};

export const getStudentController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Student ID is required.");
	}

	const student = await findStudentByID(id);

	res.status(StatusCodes.OK).json({
		success: true,
		data: student,
	});
};

export const updateStudentController = async (req: Request, res: Response) => {
	const { id } = req.params;
	const {
		firstName,
		lastName,
		middleName,
		email,
		phone,
		age,
		gender,
		address,
		bio,
		studentId,
	} = req.body;

	if (!id) {
		throw new BadRequestError("Student ID is required.");
	}

	// Handle avatar upload if provided - use Cloudinary URL if available
	const avatar = req.cloudUrls && req.cloudUrls.length > 0 ? req.cloudUrls[0] : undefined;

	const updateData = {
		...(firstName && { firstName }),
		...(lastName && { lastName }),
		...(middleName !== undefined && { middleName }),
		...(email && { email }),
		...(phone && { phone }),
		...(age !== undefined && { age }),
		...(gender && { gender }),
		...(address !== undefined && { address }),
		...(bio !== undefined && { bio }),
		...(studentId !== undefined && { studentId }),
		...(avatar && { avatar }),
	};

	const updatedStudent = await updateStudentData(id, updateData);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Student updated successfully",
		data: updatedStudent,
	});
};

export const deleteStudentController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Student ID is required.");
	}

	await deleteStudentData(id);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Student deactivated successfully",
	});
};

// Helper function to send student credentials
const sendStudentCredentials = async (user: any, password: string) => {
	try {
		const projectRoot = process.cwd();
		const candidateAssetDirs = [
			path.join(projectRoot, "assets"),
			path.join(projectRoot, "src", "assets"),
			path.join(projectRoot, "dist", "assets"),
		];
		const assetsDir = candidateAssetDirs.find((p) => fs.existsSync(p)) || candidateAssetDirs[0];

		await sendMail({
			email: user.email,
			subject: "Welcome to TraceSys - Your Account Credentials",
			template: "student-credentials.ejs",
			data: {
				user: {
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
					studentId: user.studentId,
				},
				password,
				loginUrl: `${process.env.CLIENT_URL}/login/student`,
			},
			attachments: [
				{
					filename: "logo.png",
					path: path.join(assetsDir, "logo.png"),
					cid: "logo",
				},
			],
		});
	} catch (error) {
		console.error("Failed to send student credentials:", error);
		// Don't throw error here as student creation was successful
	}
};