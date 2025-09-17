import sequelize from "@/db";
import User, { UserRole } from "@/db/models/user";
import Department from "@/db/models/department";
import Course from "@/db/models/course";
import Section from "@/db/models/section";
import StudentEnrollment from "@/db/models/student-enrollment";
import Agency from "@/db/models/agency";
import Supervisor from "@/db/models/supervisor";
import Practicum from "@/db/models/practicum";
import RequirementTemplate from "@/db/models/requirement-template";
import Requirement from "@/db/models/requirement";
import { BadRequestError, ConflictError, NotFoundError } from "@/utils/error";
import { Op } from "sequelize";

interface CreateStudentParams {
	firstName: string;
	lastName: string;
	middleName?: string;
	email: string;
	phone: string;
	age: number;
	gender: string;
	studentId: string;
	password: string;
	avatar?: string;
	department: string;
	course: string;
	section: string;
	year: string;
	semester: string;
	agency: string;
	agencyAddress: string;
	supervisor: string;
	supervisorEmail: string;
	supervisorPhone: string;
	startDate: string;
	endDate: string;
	sendCredentials?: boolean;
}

export const findStudentByID = async (id: string) => {
	const student = await User.findOne({
		where: { id, role: UserRole.STUDENT },
		include: [
			{
				model: Practicum,
				as: "practicums",
				include: [
					{
						model: Agency,
						as: "agency",
					},
					{
						model: Supervisor,
						as: "supervisor",
					},
				],
			},
			{
				model: StudentEnrollment,
				as: "enrollments",
				include: [
					{
						model: Section,
						as: "section",
						include: [
							{
								model: Course,
								as: "course",
							},
						],
					},
				],
			},
			{
				model: Requirement,
				as: "requirements",
			},
		],
	});

	if (!student) throw new NotFoundError("Student not found.");

	return student;
};

export const createStudentData = async (studentData: CreateStudentParams) => {
	const t = await sequelize.transaction();

	try {
		// Check if user already exists
		const existingUser = await User.findOne({
			where: { email: studentData.email },
			transaction: t,
		});

		if (existingUser) {
			throw new ConflictError("User with this email already exists");
		}

		// Check if student ID already exists
		const existingStudent = await User.findOne({
			where: { studentId: studentData.studentId },
			transaction: t,
		});

		if (existingStudent) {
			throw new ConflictError("Student ID already exists");
		}

		// Create user
		const user = await User.create(
			{
				firstName: studentData.firstName,
				lastName: studentData.lastName,
				middleName: studentData.middleName,
				email: studentData.email,
				phone: studentData.phone,
				age: studentData.age,
				gender: studentData.gender,
				studentId: studentData.studentId,
				password: studentData.password,
				role: UserRole.STUDENT,
				avatar: studentData.avatar || "",
				isActive: true,
				emailVerified: false,
			},
			{ transaction: t }
		);

		// Find or create course
		let courseRecord = await Course.findOne({
			where: { code: studentData.course },
			transaction: t,
		});

		if (!courseRecord) {
			// Find or create department based on provided department code
			let department = await Department.findOne({
				where: { code: studentData.department },
				transaction: t,
			});

			if (!department) {
				// Create department with the provided code
				const departmentNames: { [key: string]: string } = {
					CAST: "College of Arts, Sciences, and Technology",
					CTE: "College of Teachers in Education",
					CBAM: "College of Business Administration and Management",
				};

				department = await Department.create(
					{
						name: departmentNames[studentData.department] || studentData.department,
						code: studentData.department,
						description: `Department of ${departmentNames[studentData.department] || studentData.department}`,
						isActive: true,
					},
					{ transaction: t }
				);
			}

			courseRecord = await Course.create(
				{
					name: studentData.course,
					code: studentData.course,
					description: `Course for ${studentData.course}`,
					credits: 3,
					departmentId: department.id,
				},
				{ transaction: t }
			);
		}

		// Find or create section
		let sectionRecord = await Section.findOne({
			where: {
				name: studentData.section,
				courseId: courseRecord.id,
				year: studentData.year,
				semester: studentData.semester,
			},
			transaction: t,
		});

		if (!sectionRecord) {
			// Find or create a default instructor
			let instructor = await User.findOne({
				where: { role: "instructor" },
				transaction: t,
			});

			if (!instructor) {
				// Create a default instructor if none exists
				instructor = await User.create(
					{
						firstName: "Default",
						lastName: "Instructor",
						email: "instructor@default.com",
						phone: "0000000000",
						age: 30,
						gender: "other",
						password: "default123",
						role: "instructor",
						isActive: true,
						emailVerified: true,
					},
					{ transaction: t }
				);
			}

			sectionRecord = await Section.create(
				{
					name: studentData.section,
					code: `${studentData.course}-${studentData.section}-${studentData.year}-${studentData.semester}`,
					courseId: courseRecord.id,
					instructorId: instructor.id,
					year: studentData.year,
					semester: studentData.semester,
					academicYear: new Date().getFullYear().toString(),
					maxStudents: 50,
					isActive: true,
				},
				{ transaction: t }
			);
		}

		// Create student enrollment
		await StudentEnrollment.create(
			{
				studentId: user.id,
				sectionId: sectionRecord.id,
				enrollmentDate: new Date(),
				status: "enrolled",
			},
			{ transaction: t }
		);

		// Find or create agency
		let agencyRecord = await Agency.findOne({
			where: { name: studentData.agency },
			transaction: t,
		});

		if (!agencyRecord) {
			agencyRecord = await Agency.create(
				{
					name: studentData.agency,
					address: studentData.agencyAddress,
					contactPerson: studentData.supervisor,
					contactRole: "Supervisor",
					contactPhone: studentData.supervisorPhone,
					contactEmail: studentData.supervisorEmail,
					branchType: "Main",
					isActive: true,
				},
				{ transaction: t }
			);
		}

		// Find or create supervisor
		let supervisorRecord = await Supervisor.findOne({
			where: { email: studentData.supervisorEmail },
			transaction: t,
		});

		if (!supervisorRecord) {
			supervisorRecord = await Supervisor.create(
				{
					agencyId: agencyRecord.id,
					name: studentData.supervisor,
					email: studentData.supervisorEmail,
					phone: studentData.supervisorPhone,
					position: "Supervisor",
					isActive: true,
				},
				{ transaction: t }
			);
		}

		// Create practicum
		const practicum = await Practicum.create(
			{
				studentId: user.id,
				agencyId: agencyRecord.id,
				supervisorId: supervisorRecord.id,
				position: "Student Intern",
				startDate: new Date(studentData.startDate),
				endDate: new Date(studentData.endDate),
				totalHours: 400,
				completedHours: 0,
				workSetup: "On-site",
				status: "active",
			},
			{ transaction: t }
		);

		// Create default requirements for the student
		await createDefaultRequirements(user.id, t);

		await t.commit();

		return {
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phone: user.phone,
				studentId: user.studentId,
				role: user.role,
			},
			practicum: {
				id: practicum.id,
				agency: agencyRecord.name,
				supervisor: supervisorRecord.name,
				startDate: practicum.startDate,
				endDate: practicum.endDate,
			},
			enrollment: {
				course: courseRecord.name,
				section: sectionRecord.name,
				year: sectionRecord.year,
				semester: sectionRecord.semester,
			},
		};
	} catch (error) {
		await t.rollback();
		throw error;
	}
};

// Helper function to create default requirements
const createDefaultRequirements = async (studentId: string, transaction: any) => {
	const defaultRequirements = [
		{
			title: "Medical Certificate",
			description: "Medical clearance certificate from a licensed physician",
			category: "health" as const,
			priority: "high" as const,
			isRequired: true,
		},
		{
			title: "Insurance Certificate",
			description: "Insurance coverage certificate for practicum period",
			category: "health" as const,
			priority: "high" as const,
			isRequired: true,
		},
		{
			title: "Company MOA",
			description: "Memorandum of Agreement with the practicum company",
			category: "legal" as const,
			priority: "urgent" as const,
			isRequired: true,
		},
		{
			title: "Practicum Agreement",
			description: "Signed practicum agreement form",
			category: "legal" as const,
			priority: "urgent" as const,
			isRequired: true,
		},
	];

	for (const reqData of defaultRequirements) {
		// Find or create requirement template
		let template = await RequirementTemplate.findOne({
			where: { title: reqData.title },
			transaction,
		});

		if (!template) {
			// Find any existing user to use as createdBy, or create a system user
			let systemUser = await User.findOne({
				where: { role: "admin" },
				transaction,
			});

			if (!systemUser) {
				systemUser = await User.findOne({
					where: { role: "instructor" },
					transaction,
				});
			}

			// If no user exists, create a system user
			if (!systemUser) {
				systemUser = await User.create(
					{
						firstName: "System",
						lastName: "Admin",
						email: "system@tracesys.com",
						phone: "0000000000",
						age: 30,
						gender: "other",
						password: "system123",
						role: "admin",
						isActive: true,
						emailVerified: true,
					},
					{ transaction }
				);
			}

			template = await RequirementTemplate.create(
				{
					...reqData,
					createdBy: systemUser.id,
					isActive: true,
				},
				{ transaction }
			);
		}

		// Create requirement for student
		await Requirement.create(
			{
				studentId,
				templateId: template.id,
				title: reqData.title,
				description: reqData.description,
				category: reqData.category,
				priority: reqData.priority,
				status: "pending",
				dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
			},
			{ transaction }
		);
	}
};

export const getStudentsData = async (params: {
	page: number;
	limit: number;
	search: string;
}) => {
	const { page, limit, search } = params;
	const offset = (page - 1) * limit;

	const whereClause: any = {
		role: UserRole.STUDENT,
	};

	if (search) {
		whereClause[Op.or] = [
			{ firstName: { [Op.iLike]: `%${search}%` } },
			{ lastName: { [Op.iLike]: `%${search}%` } },
			{ email: { [Op.iLike]: `%${search}%` } },
			{ studentId: { [Op.iLike]: `%${search}%` } },
		];
	}

	const students = await User.findAndCountAll({
		where: whereClause,
		include: [
			{
				model: Practicum,
				as: "practicums",
				include: [
					{
						model: Agency,
						as: "agency",
					},
					{
						model: Supervisor,
						as: "supervisor",
					},
				],
			},
			{
				model: StudentEnrollment,
				as: "enrollments",
				include: [
					{
						model: Section,
						as: "section",
						include: [
							{
								model: Course,
								as: "course",
							},
						],
					},
				],
			},
		],
		limit,
		offset,
		order: [["createdAt", "DESC"]],
	});

	return {
		students: students.rows,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(students.count / limit),
			totalItems: students.count,
			itemsPerPage: limit,
		},
	};
};

export const updateStudentData = async (id: string, studentData: Partial<CreateStudentParams>) => {
	const t = await sequelize.transaction();

	const student = await User.findByPk(id);
	if (!student) {
		await t.rollback();
		throw new NotFoundError("Student not found.");
	}

	// Check if email is being updated and if it already exists
	if (studentData.email && studentData.email !== student.email) {
		const existingUser = await User.findOne({
			where: { email: studentData.email },
		});
		if (existingUser) {
			await t.rollback();
			throw new ConflictError("Email already exists.");
		}
	}

	// Check if studentId is being updated and if it already exists
	if (studentData.studentId && studentData.studentId !== student.studentId) {
		const existingStudent = await User.findOne({
			where: { studentId: studentData.studentId },
		});
		if (existingStudent) {
			await t.rollback();
			throw new ConflictError("Student ID already exists.");
		}
	}

	// Update student information
	const updatedStudent = await student.update(
		{
			...(studentData.firstName && { firstName: studentData.firstName }),
			...(studentData.lastName && { lastName: studentData.lastName }),
			...(studentData.middleName !== undefined && { middleName: studentData.middleName }),
			...(studentData.email && { email: studentData.email }),
			...(studentData.phone && { phone: studentData.phone }),
			...(studentData.age !== undefined && { age: studentData.age }),
			...(studentData.gender && { gender: studentData.gender }),
			...(studentData.avatar !== undefined && { avatar: studentData.avatar }),
			...(studentData.studentId !== undefined && { studentId: studentData.studentId }),
		},
		{ transaction: t }
	);

	await t.commit();

	return updatedStudent;
};

export const deleteStudentData = async (id: string) => {
	const t = await sequelize.transaction();

	const student = await User.findByPk(id);
	if (!student) {
		await t.rollback();
		throw new NotFoundError("Student not found.");
	}

	// Soft delete by setting isActive to false
	await student.update({ isActive: false }, { transaction: t });

	await t.commit();

	return student;
};

export const getStudentsByTeacherData = async (params: {
	teacherId: string;
	page: number;
	limit: number;
	search: string;
}) => {
	const { teacherId, page, limit, search } = params;
	const offset = (page - 1) * limit;

	// First verify that the teacher exists
	const teacher = await User.findOne({
		where: { id: teacherId, role: UserRole.INSTRUCTOR },
	});

	if (!teacher) {
		throw new NotFoundError("Teacher not found.");
	}

	const whereClause: any = {
		role: UserRole.STUDENT,
	};

	if (search) {
		whereClause[Op.or] = [
			{ firstName: { [Op.iLike]: `%${search}%` } },
			{ lastName: { [Op.iLike]: `%${search}%` } },
			{ email: { [Op.iLike]: `%${search}%` } },
			{ studentId: { [Op.iLike]: `%${search}%` } },
		];
	}

	const students = await User.findAndCountAll({
		where: whereClause,
		include: [
			{
				model: Practicum,
				as: "practicums",
				include: [
					{
						model: Agency,
						as: "agency",
					},
					{
						model: Supervisor,
						as: "supervisor",
					},
				],
			},
			// {
			// 	model: StudentEnrollment,
			// 	as: "enrollments",
			// 	required: true, // Only include students who have enrollments
			// 	include: [
			// 		{
			// 			model: Section,
			// 			as: "section",
			// 			required: true,
			// 			where: { instructorId: teacherId }, // Filter by teacher ID
			// 			include: [
			// 				{
			// 					model: Course,
			// 					as: "course",
			// 				},
			// 			],
			// 		},
			// 	],
			// },
		],
		limit,
		offset,
		order: [["createdAt", "DESC"]],
	});

	return {
		students: students.rows,
		teacher: {
			id: teacher.id,
			firstName: teacher.firstName,
			lastName: teacher.lastName,
			email: teacher.email,
		},
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(students.count / limit),
			totalItems: students.count,
			itemsPerPage: limit,
		},
	};
};
