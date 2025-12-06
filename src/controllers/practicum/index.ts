import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "@/utils/error";
import Practicum from "@/db/models/practicum";
import StudentEnrollment from "@/db/models/student-enrollment";
import Section from "@/db/models/section";
import Course from "@/db/models/course";
import Agency from "@/db/models/agency";
import Supervisor from "@/db/models/supervisor";
import User, { UserRole } from "@/db/models/user";
import { Transaction } from "sequelize";
import sequelize from "@/db";

interface PracticumPayload {
	agencyId: string;
	supervisorId?: string;
	startDate: string;
	endDate: string;
	position?: string;
	totalHours?: number;
	workSetup?: "On-site" | "Hybrid" | "Work From Home";
}

export const upsertPracticumController = async (req: Request, res: Response) => {
	const studentId = req.user?.id;

	if (!studentId) {
		throw new UnauthorizedError("User not authenticated");
	}

	const {
		agencyId,
		supervisorId,
		startDate,
		endDate,
		position = "Student Intern",
		totalHours = 400,
		workSetup = "On-site",
	}: PracticumPayload = req.body;

	if (!agencyId || !startDate || !endDate) {
		throw new BadRequestError("agencyId, startDate, and endDate are required");
	}

	const student = await User.findByPk(studentId);

	if (!student) {
		throw new NotFoundError("Student not found");
	}

	if (student.role !== UserRole.STUDENT) {
		throw new ForbiddenError("Only students can create a practicum assignment");
	}

	const agency = await Agency.findByPk(agencyId);

	if (!agency) {
		throw new NotFoundError("Agency not found");
	}

	// Only validate supervisor if provided
	if (supervisorId) {
		const supervisor = await Supervisor.findOne({
			where: { id: supervisorId, agencyId },
		});

		if (!supervisor) {
			throw new NotFoundError("Supervisor not found for the selected agency");
		}
	}

	const transaction: Transaction = await sequelize.transaction();

	try {
		const enrollment = await StudentEnrollment.findOne({
			where: { studentId },
			include: [
				{
					model: Section,
					as: "section",
					include: [{ model: Course, as: "course" }],
				},
			],
			order: [["createdAt", "DESC"]],
			transaction,
		});

		if (!enrollment || !enrollment.section) {
			throw new BadRequestError("Student must be enrolled in a section before creating a practicum");
		}

		const course = enrollment.section.course;

		const existingPracticum = await Practicum.findOne({
			where: { studentId },
			transaction,
		});

		const payload: any = {
			studentId,
			agencyId,
			sectionId: enrollment.sectionId,
			courseId: course?.id || enrollment.section.courseId || null,
			departmentId: course?.departmentId || null,
			position,
			startDate: new Date(startDate),
			endDate: new Date(endDate),
			totalHours: Number(totalHours) || 400,
			workSetup,
			status: "active" as const,
			supervisorId: supervisorId || null, // Allow null to remove supervisor
		};

		let practicum: Practicum;

		if (existingPracticum) {
			await existingPracticum.update(
				{
					...payload,
					completedHours: existingPracticum.completedHours ?? 0,
				},
				{ transaction }
			);
			practicum = existingPracticum;
		} else {
			practicum = await Practicum.create(
				{
					...payload,
					completedHours: 0,
				},
				{ transaction }
			);
		}

		await transaction.commit();

		const practicumWithRelations = await Practicum.findByPk(practicum.id, {
			include: [
				{ model: Agency, as: "agency" },
				{ model: Supervisor, as: "supervisor" },
			],
		});

		res.status(existingPracticum ? StatusCodes.OK : StatusCodes.CREATED).json({
			success: true,
			message: existingPracticum ? "Practicum updated successfully" : "Practicum created successfully",
			data: practicumWithRelations,
		});
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
};






