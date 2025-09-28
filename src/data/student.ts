import sequelize from "@/db";
import User, { UserRole } from "@/db/models/user";
import Department from "@/db/models/department";
import Course from "@/db/models/course";
import Section from "@/db/models/section";
import Agency from "@/db/models/agency";
import Supervisor from "@/db/models/supervisor";
import Practicum from "@/db/models/practicum";
import RequirementTemplate from "@/db/models/requirement-template";
import Requirement from "@/db/models/requirement";
import { ConflictError, NotFoundError } from "@/utils/error";
import { Op } from "sequelize";
import StudentEnrollment from "@/db/models/student-enrollment";

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
	// Optional practicum information
	agency?: string;
	agencyAddress?: string;
	supervisor?: string;
	supervisorEmail?: string;
	supervisorPhone?: string;
	startDate?: string;
	endDate?: string;
	sendCredentials?: boolean;
}

interface UpdateStudentParams {
	firstName?: string;
	lastName?: string;
	middleName?: string;
	email?: string;
	phone?: string;
	age?: number;
	gender?: string;
	studentId?: string;
	avatar?: string;
	address?: string;
	bio?: string;
	departmentId?: string;
	courseId?: string;
	sectionId?: string;
	yearLevel?: string;
	program?: string;
	agencyId?: string;
	supervisorId?: string;
	position?: string;
	startDate?: string;
	endDate?: string;
	totalHours?: number;
	workSetup?: "On-site" | "Hybrid" | "Work From Home";
}

export const findStudentByID = async (id: string) => {
	const student = await User.findOne({
		where: { id, role: UserRole.STUDENT },
		include: [
			{
				model: Department,
				as: "department",
			},
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
                    {
                        model: Section,
                        as: "section",
                        include: [
                            {
                                model: Course,
                                as: "course",
                                include: [
                                    {
                                        model: Department,
                                        as: "department",
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        model: Course,
                        as: "course",
                        include: [
                            {
                                model: Department,
                                as: "department",
                            },
                        ],
                    },
                    {
                        model: Department,
                        as: "department",
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
								include: [
									{
										model: Department,
										as: "department",
									},
								],
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

        // Create practicum only if agency information is provided
		let practicum = null;
		if (studentData.agency && studentData.supervisor && studentData.startDate && studentData.endDate) {
			// Find or create agency
			let agencyRecord = await Agency.findOne({
				where: { name: studentData.agency },
				transaction: t,
			});

			if (!agencyRecord) {
				agencyRecord = await Agency.create(
					{
						name: studentData.agency,
						address: studentData.agencyAddress || "",
						contactPerson: studentData.supervisor,
						contactRole: "Supervisor",
						contactPhone: studentData.supervisorPhone || "",
						contactEmail: studentData.supervisorEmail || "",
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
						email: studentData.supervisorEmail || "",
						phone: studentData.supervisorPhone || "",
						position: "Supervisor",
						isActive: true,
					},
					{ transaction: t }
				);
			}

			// Create practicum
			practicum = await Practicum.create(
				{
					studentId: user.id,
					agencyId: agencyRecord.id,
					supervisorId: supervisorRecord.id,
                    sectionId: sectionRecord.id,
                    courseId: courseRecord.id,
                    departmentId: courseRecord.departmentId,
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
		}

		// Create default requirements for the student
		await createDefaultRequirements(user.id, t);

		await t.commit();

		// Fetch practicum with related data if it exists
		let practicumData = null;
		if (practicum) {
			const practicumWithRelations = await Practicum.findByPk(practicum.id, {
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
				transaction: t,
			});
			
			practicumData = {
				id: practicumWithRelations!.id,
				agency: practicumWithRelations!.agency?.name || "Not assigned",
				supervisor: practicumWithRelations!.supervisor?.name || "Not assigned",
				startDate: practicumWithRelations!.startDate,
				endDate: practicumWithRelations!.endDate,
			};
		}

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
			practicum: practicumData,
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
			{ firstName: { [Op.like]: `%${search}%` } },
			{ lastName: { [Op.like]: `%${search}%` } },
			{ email: { [Op.like]: `%${search}%` } },
			{ studentId: { [Op.like]: `%${search}%` } },
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
                    {
                        model: Section,
                        as: "section",
                        include: [
                            {
                                model: Course,
                                as: "course",
                                include: [
                                    {
                                        model: Department,
                                        as: "department",
                                    },
                                ],
                            },
                        ],
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
		limit,
		offset,
		order: [["createdAt", "DESC"]],
	});

	return {
		students: students.rows,
		enrollments: students.rows.map(student => student.enrollments),
		practicums: students.rows.map(student => student.practicums),
		requirements: students.rows.map(student => student.requirements),
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(students.count / limit),
			totalItems: students.count,
			itemsPerPage: limit,
		},
	};
};

export const updateStudentData = async (id: string, studentData: UpdateStudentParams) => {
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
			...(studentData.address !== undefined && { address: studentData.address }),
			...(studentData.bio !== undefined && { bio: studentData.bio }),
			...(studentData.departmentId && { departmentId: studentData.departmentId }),
			...(studentData.yearLevel && { yearLevel: studentData.yearLevel }),
			...(studentData.program && { program: studentData.program }),
		},
		{ transaction: t }
	);

	// Update enrollment if sectionId is provided
	if (studentData.sectionId) {
		const enrollment = await StudentEnrollment.findOne({
			where: { studentId: id },
			transaction: t
		});

		if (enrollment) {
			await enrollment.update(
				{ sectionId: studentData.sectionId },
				{ transaction: t }
			);
		}
	}

	// Update practicum if practicum data is provided
    if (studentData.agencyId || studentData.supervisorId || studentData.position || 
        studentData.startDate || studentData.endDate || studentData.totalHours !== undefined || 
        studentData.workSetup || studentData.sectionId || studentData.courseId || studentData.departmentId) {
		
		const practicum = await Practicum.findOne({
			where: { studentId: id },
			transaction: t
		});

		if (practicum) {
			const practicumUpdateData: any = {};
			if (studentData.agencyId) practicumUpdateData.agencyId = studentData.agencyId;
			if (studentData.supervisorId) practicumUpdateData.supervisorId = studentData.supervisorId;
			if (studentData.position) practicumUpdateData.position = studentData.position;
			if (studentData.startDate) practicumUpdateData.startDate = studentData.startDate;
			if (studentData.endDate) practicumUpdateData.endDate = studentData.endDate;
			if (studentData.totalHours !== undefined) practicumUpdateData.totalHours = studentData.totalHours;
			if (studentData.workSetup) practicumUpdateData.workSetup = studentData.workSetup;
			if (studentData.courseId) practicumUpdateData.courseId = studentData.courseId;
			if (studentData.departmentId) practicumUpdateData.departmentId = studentData.departmentId;
			if (studentData.sectionId) practicumUpdateData.sectionId = studentData.sectionId;

            // Derive courseId/departmentId from sectionId if provided and not explicitly set
            if (studentData.sectionId && (!studentData.courseId || !studentData.departmentId)) {
                const section = await Section.findByPk(studentData.sectionId, {
                    include: [{ model: Course, as: "course" }],
                    transaction: t,
                });
                if (section?.course) {
                    if (!studentData.courseId) practicumUpdateData.courseId = section.course.id;
                    if (!studentData.departmentId) practicumUpdateData.departmentId = section.course.departmentId;
                }
            }

			await practicum.update(practicumUpdateData, { transaction: t });
		}
	}

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
			{ firstName: { [Op.like]: `%${search}%` } },
			{ lastName: { [Op.like]: `%${search}%` } },
			{ email: { [Op.like]: `%${search}%` } },
			{ studentId: { [Op.like]: `%${search}%` } },
		];
	}

	try {
		// Query StudentEnrollment with all necessary includes
		const enrollments = await StudentEnrollment.findAndCountAll({
			include: [
				{
					model: User,
					as: "student",
					where: whereClause,
					include: [
						{
							model: Department,
							as: "department",
						},
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
					],
				},
				{
					model: Section,
					as: "section",
					where: { instructorId: teacherId },
					include: [
						{
							model: Course,
							as: "course",
							include: [
								{
									model: Department,
									as: "department",
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

		// Get the students from the enrollments
		const students = enrollments.rows.map(enrollment => {
			const student = enrollment.student;
			// Attach enrollment data to student
			student.enrollments = [enrollment];
			return student;
		});

		// Add additional data for each student
		const enrichedStudents = students.map(student => {
			// Get the current enrollment
			const enrollment = student.enrollments?.[0];
			const section = enrollment?.section;
			const course = section?.course;
			const practicum = student.practicums?.[0];
			const agency = practicum?.agency;
			

			const computedFields = {
				courseName: course?.name || course?.code || "-",
				courseCode: course?.code || "-",
				sectionName: section?.name || "-",
				academicYear: section?.academicYear || "-",
				agencyName: agency?.name || "-",
				agencyDetails: agency ? {
					name: agency.name,
					address: agency.address,
					contactPerson: agency.contactPerson,
					contactPhone: agency.contactPhone,
					contactEmail: agency.contactEmail,
				} : null,
				practicumDetails: practicum ? {
					position: practicum.position,
					startDate: practicum.startDate,
					endDate: practicum.endDate,
					totalHours: practicum.totalHours,
					completedHours: practicum.completedHours,
					workSetup: practicum.workSetup,
					status: practicum.status,
				} : null,
				// Placeholder data for future implementation
				attendance: undefined as number | undefined,
				requirements: undefined as number | undefined,
				reports: undefined as number | undefined,
			};
			
			
			return {
				...student.toJSON(),
				// Ensure all required fields are present
				enrollments: student.enrollments || [],
				practicums: student.practicums || [],
				// Add computed fields for easier frontend access
				computed: computedFields
			};
		});

		return {
			students: enrichedStudents,
			teacher: {
				id: teacher.id,
				firstName: teacher.firstName,
				lastName: teacher.lastName,
				email: teacher.email,
			},
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(enrollments.count / limit),
				totalItems: enrollments.count,
				itemsPerPage: limit,
			},
		};
	} catch (error) {
		console.error("Error in getStudentsByTeacherData:", error);
		throw error;
	}
};
