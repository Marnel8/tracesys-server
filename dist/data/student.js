"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentsByTeacherData = exports.deleteStudentData = exports.updateStudentData = exports.getStudentsData = exports.createStudentFromOAuth = exports.createStudentData = exports.findStudentByID = void 0;
const db_1 = __importDefault(require("../db/index.js"));
const user_1 = __importStar(require("../db/models/user.js"));
const department_1 = __importDefault(require("../db/models/department.js"));
const course_1 = __importDefault(require("../db/models/course.js"));
const section_1 = __importDefault(require("../db/models/section.js"));
const agency_1 = __importDefault(require("../db/models/agency.js"));
const supervisor_1 = __importDefault(require("../db/models/supervisor.js"));
const practicum_1 = __importDefault(require("../db/models/practicum.js"));
const requirement_template_1 = __importDefault(require("../db/models/requirement-template.js"));
const requirement_1 = __importDefault(require("../db/models/requirement.js"));
const attendance_record_1 = __importDefault(require("../db/models/attendance-record.js"));
const error_1 = require("../utils/error.js");
const sequelize_1 = require("sequelize");
const student_enrollment_1 = __importDefault(require("../db/models/student-enrollment.js"));
const findStudentByID = async (id) => {
    const student = await user_1.default.findOne({
        where: { id, role: user_1.UserRole.STUDENT },
        include: [
            {
                model: department_1.default,
                as: "department",
            },
            {
                model: practicum_1.default,
                as: "practicums",
                include: [
                    {
                        model: agency_1.default,
                        as: "agency",
                    },
                    {
                        model: supervisor_1.default,
                        as: "supervisor",
                    },
                    {
                        model: section_1.default,
                        as: "section",
                        include: [
                            {
                                model: course_1.default,
                                as: "course",
                                include: [
                                    {
                                        model: department_1.default,
                                        as: "department",
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        model: course_1.default,
                        as: "course",
                        include: [
                            {
                                model: department_1.default,
                                as: "department",
                            },
                        ],
                    },
                    {
                        model: department_1.default,
                        as: "department",
                    },
                ],
            },
            {
                model: student_enrollment_1.default,
                as: "enrollments",
                include: [
                    {
                        model: section_1.default,
                        as: "section",
                        include: [
                            {
                                model: course_1.default,
                                as: "course",
                                include: [
                                    {
                                        model: department_1.default,
                                        as: "department",
                                    },
                                ],
                            },
                            {
                                model: user_1.default,
                                as: "instructor",
                                attributes: ["id", "allowLoginWithoutRequirements"],
                            },
                        ],
                    },
                ],
            },
            {
                model: requirement_1.default,
                as: "requirements",
            },
        ],
    });
    if (!student)
        throw new error_1.NotFoundError("Student not found.");
    return student;
};
exports.findStudentByID = findStudentByID;
const createStudentData = async (studentData) => {
    const t = await db_1.default.transaction();
    try {
        // Check if user already exists
        const existingUser = await user_1.default.findOne({
            where: { email: studentData.email },
            transaction: t,
        });
        if (existingUser) {
            throw new error_1.ConflictError("User with this email already exists");
        }
        // Check if student ID already exists
        const existingStudent = await user_1.default.findOne({
            where: { studentId: studentData.studentId },
            transaction: t,
        });
        if (existingStudent) {
            throw new error_1.ConflictError("Student ID already exists");
        }
        // Create user
        const user = await user_1.default.create({
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            middleName: studentData.middleName,
            email: studentData.email,
            phone: studentData.phone,
            age: studentData.age,
            gender: studentData.gender,
            studentId: studentData.studentId,
            password: studentData.password,
            role: user_1.UserRole.STUDENT,
            avatar: studentData.avatar || "",
            isActive: true,
            emailVerified: false,
        }, { transaction: t });
        // Find or create course
        let courseRecord = await course_1.default.findOne({
            where: { code: studentData.course },
            transaction: t,
        });
        if (!courseRecord) {
            // Find or create department based on provided department code
            let department = await department_1.default.findOne({
                where: { code: studentData.department },
                transaction: t,
            });
            if (!department) {
                // Create department with the provided code
                const departmentNames = {
                    CAST: "College of Arts, Sciences, and Technology",
                    CTE: "College of Teachers in Education",
                    CBAM: "College of Business Administration and Management",
                };
                department = await department_1.default.create({
                    name: departmentNames[studentData.department] || studentData.department,
                    code: studentData.department,
                    description: `Department of ${departmentNames[studentData.department] || studentData.department}`,
                    isActive: true,
                }, { transaction: t });
            }
            courseRecord = await course_1.default.create({
                name: studentData.course,
                code: studentData.course,
                description: `Course for ${studentData.course}`,
                credits: 3,
                departmentId: department.id,
            }, { transaction: t });
        }
        // Find or create section
        let sectionRecord = await section_1.default.findOne({
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
            let instructor = await user_1.default.findOne({
                where: { role: "instructor" },
                transaction: t,
            });
            if (!instructor) {
                // Create a default instructor if none exists
                instructor = await user_1.default.create({
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
                }, { transaction: t });
            }
            sectionRecord = await section_1.default.create({
                name: studentData.section,
                code: `${studentData.course}-${studentData.section}-${studentData.year}-${studentData.semester}`,
                courseId: courseRecord.id,
                instructorId: instructor.id,
                year: studentData.year,
                semester: studentData.semester,
                academicYear: new Date().getFullYear().toString(),
                maxStudents: 50,
                isActive: true,
            }, { transaction: t });
        }
        // Create student enrollment
        await student_enrollment_1.default.create({
            studentId: user.id,
            sectionId: sectionRecord.id,
            enrollmentDate: new Date(),
            status: "enrolled",
        }, { transaction: t });
        // Create practicum only if agency information is provided
        let practicum = null;
        if (studentData.agency && studentData.supervisor && studentData.startDate && studentData.endDate) {
            // Find or create agency
            let agencyRecord = await agency_1.default.findOne({
                where: { name: studentData.agency },
                transaction: t,
            });
            if (!agencyRecord) {
                agencyRecord = await agency_1.default.create({
                    name: studentData.agency,
                    address: studentData.agencyAddress || "",
                    contactPerson: studentData.supervisor,
                    contactRole: "Supervisor",
                    contactPhone: studentData.supervisorPhone || "",
                    contactEmail: studentData.supervisorEmail || "",
                    branchType: "Main",
                    isActive: true,
                }, { transaction: t });
            }
            // Find or create supervisor
            let supervisorRecord = await supervisor_1.default.findOne({
                where: { email: studentData.supervisorEmail },
                transaction: t,
            });
            if (!supervisorRecord) {
                supervisorRecord = await supervisor_1.default.create({
                    agencyId: agencyRecord.id,
                    name: studentData.supervisor,
                    email: studentData.supervisorEmail || "",
                    phone: studentData.supervisorPhone || "",
                    position: "Supervisor",
                    isActive: true,
                }, { transaction: t });
            }
            // Create practicum
            practicum = await practicum_1.default.create({
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
            }, { transaction: t });
        }
        // Create default requirements for the student
        await createDefaultRequirements(user.id, t);
        await t.commit();
        // Fetch practicum with related data if it exists
        let practicumData = null;
        if (practicum) {
            const practicumWithRelations = await practicum_1.default.findByPk(practicum.id, {
                include: [
                    {
                        model: agency_1.default,
                        as: "agency",
                    },
                    {
                        model: supervisor_1.default,
                        as: "supervisor",
                    },
                ],
                transaction: t,
            });
            practicumData = {
                id: practicumWithRelations.id,
                agency: practicumWithRelations.agency?.name || "Not assigned",
                supervisor: practicumWithRelations.supervisor?.name || "Not assigned",
                startDate: practicumWithRelations.startDate,
                endDate: practicumWithRelations.endDate,
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
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.createStudentData = createStudentData;
const createStudentFromOAuth = async (params) => {
    const t = await db_1.default.transaction();
    try {
        // Check if user already exists
        const existingUser = await user_1.default.findOne({
            where: { email: params.email },
            transaction: t,
        });
        if (existingUser) {
            throw new error_1.ConflictError("User with this email already exists");
        }
        // Validate section exists
        const sectionRecord = await section_1.default.findByPk(params.sectionId, {
            include: [course_1.default],
            transaction: t,
        });
        if (!sectionRecord) {
            throw new error_1.NotFoundError("Section not found");
        }
        // Get department from section's course if not provided
        let departmentId = params.departmentId;
        if (!departmentId && sectionRecord.course) {
            departmentId = sectionRecord.course.departmentId;
        }
        // Create user with minimal OAuth data
        const user = await user_1.default.create({
            firstName: params.firstName,
            lastName: params.lastName,
            middleName: params.middleName || null,
            email: params.email,
            password: null, // OAuth users don't have passwords
            role: user_1.UserRole.STUDENT,
            avatar: params.avatar || "",
            provider: params.provider,
            departmentId: departmentId || null,
            program: params.program || null,
            isActive: true,
            emailVerified: true, // OAuth emails are verified
            // age, phone, gender, studentId will be collected during onboarding
        }, { transaction: t });
        // Create student enrollment immediately with sectionId from invitation
        await student_enrollment_1.default.create({
            studentId: user.id,
            sectionId: params.sectionId,
            enrollmentDate: new Date(),
            status: "enrolled",
        }, { transaction: t });
        // Create default requirements for the student
        await createDefaultRequirements(user.id, t);
        await t.commit();
        return {
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                provider: user.provider,
                departmentId: user.departmentId,
                sectionId: params.sectionId,
                program: user.program,
            },
            needsOnboarding: !user.age || !user.phone || !user.gender || !user.studentId,
        };
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.createStudentFromOAuth = createStudentFromOAuth;
// Helper function to create default requirements
const createDefaultRequirements = async (studentId, transaction) => {
    const defaultRequirements = [
        {
            title: "Medical Certificate",
            description: "Medical clearance certificate from a licensed physician",
            category: "health",
            priority: "high",
            isRequired: true,
        },
        {
            title: "Insurance Certificate",
            description: "Insurance coverage certificate for practicum period",
            category: "health",
            priority: "high",
            isRequired: true,
        },
        {
            title: "Company MOA",
            description: "Memorandum of Agreement with the practicum company",
            category: "legal",
            priority: "urgent",
            isRequired: true,
        },
        {
            title: "Practicum Agreement",
            description: "Signed practicum agreement form",
            category: "legal",
            priority: "urgent",
            isRequired: true,
        },
    ];
    for (const reqData of defaultRequirements) {
        // Find or create requirement template
        let template = await requirement_template_1.default.findOne({
            where: { title: reqData.title },
            transaction,
        });
        if (!template) {
            // Find any existing user to use as createdBy, or create a system user
            let systemUser = await user_1.default.findOne({
                where: { role: "admin" },
                transaction,
            });
            if (!systemUser) {
                systemUser = await user_1.default.findOne({
                    where: { role: "instructor" },
                    transaction,
                });
            }
            // If no user exists, create a system user
            if (!systemUser) {
                systemUser = await user_1.default.create({
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
                }, { transaction });
            }
            template = await requirement_template_1.default.create({
                ...reqData,
                createdBy: systemUser.id,
                isActive: true,
            }, { transaction });
        }
        // Create requirement for student
        await requirement_1.default.create({
            studentId,
            templateId: template.id,
            title: reqData.title,
            description: reqData.description,
            category: reqData.category,
            priority: reqData.priority,
            status: "pending",
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        }, { transaction });
    }
};
const getStudentsData = async (params) => {
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;
    const whereClause = {
        role: user_1.UserRole.STUDENT,
        isActive: true, // Only include active students
    };
    if (search) {
        whereClause[sequelize_1.Op.or] = [
            { firstName: { [sequelize_1.Op.like]: `%${search}%` } },
            { lastName: { [sequelize_1.Op.like]: `%${search}%` } },
            { email: { [sequelize_1.Op.like]: `%${search}%` } },
            { studentId: { [sequelize_1.Op.like]: `%${search}%` } },
        ];
    }
    const students = await user_1.default.findAndCountAll({
        where: whereClause,
        include: [
            {
                model: practicum_1.default,
                as: "practicums",
                include: [
                    {
                        model: agency_1.default,
                        as: "agency",
                    },
                    {
                        model: supervisor_1.default,
                        as: "supervisor",
                    },
                    {
                        model: section_1.default,
                        as: "section",
                        include: [
                            {
                                model: course_1.default,
                                as: "course",
                                include: [
                                    {
                                        model: department_1.default,
                                        as: "department",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                model: student_enrollment_1.default,
                as: "enrollments",
                include: [
                    {
                        model: section_1.default,
                        as: "section",
                        include: [
                            {
                                model: course_1.default,
                                as: "course",
                            },
                        ],
                    },
                ],
            },
            {
                model: requirement_1.default,
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
exports.getStudentsData = getStudentsData;
const updateStudentData = async (id, studentData) => {
    const t = await db_1.default.transaction();
    const student = await user_1.default.findByPk(id);
    if (!student) {
        await t.rollback();
        throw new error_1.NotFoundError("Student not found.");
    }
    // Check if email is being updated and if it already exists
    if (studentData.email && studentData.email !== student.email) {
        const existingUser = await user_1.default.findOne({
            where: { email: studentData.email },
        });
        if (existingUser) {
            await t.rollback();
            throw new error_1.ConflictError("Email already exists.");
        }
    }
    // Check if studentId is being updated and if it already exists
    if (studentData.studentId && studentData.studentId !== student.studentId) {
        const existingStudent = await user_1.default.findOne({
            where: { studentId: studentData.studentId },
        });
        if (existingStudent) {
            await t.rollback();
            throw new error_1.ConflictError("Student ID already exists.");
        }
    }
    // Update student information
    const updatedStudent = await student.update({
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
    }, { transaction: t });
    // Update enrollment if sectionId is provided
    if (studentData.sectionId) {
        const enrollment = await student_enrollment_1.default.findOne({
            where: { studentId: id },
            transaction: t
        });
        if (enrollment) {
            await enrollment.update({ sectionId: studentData.sectionId }, { transaction: t });
        }
    }
    // Update practicum if practicum data is provided
    if (studentData.agencyId || studentData.supervisorId || studentData.position ||
        studentData.startDate || studentData.endDate || studentData.totalHours !== undefined ||
        studentData.workSetup || studentData.sectionId || studentData.courseId || studentData.departmentId) {
        const practicum = await practicum_1.default.findOne({
            where: { studentId: id },
            transaction: t
        });
        if (practicum) {
            const practicumUpdateData = {};
            if (studentData.agencyId)
                practicumUpdateData.agencyId = studentData.agencyId;
            if (studentData.supervisorId)
                practicumUpdateData.supervisorId = studentData.supervisorId;
            if (studentData.position)
                practicumUpdateData.position = studentData.position;
            if (studentData.startDate)
                practicumUpdateData.startDate = studentData.startDate;
            if (studentData.endDate)
                practicumUpdateData.endDate = studentData.endDate;
            if (studentData.totalHours !== undefined)
                practicumUpdateData.totalHours = studentData.totalHours;
            if (studentData.workSetup)
                practicumUpdateData.workSetup = studentData.workSetup;
            if (studentData.courseId)
                practicumUpdateData.courseId = studentData.courseId;
            if (studentData.departmentId)
                practicumUpdateData.departmentId = studentData.departmentId;
            if (studentData.sectionId)
                practicumUpdateData.sectionId = studentData.sectionId;
            // Derive courseId/departmentId from sectionId if provided and not explicitly set
            if (studentData.sectionId && (!studentData.courseId || !studentData.departmentId)) {
                const section = await section_1.default.findByPk(studentData.sectionId, {
                    include: [{ model: course_1.default, as: "course" }],
                    transaction: t,
                });
                if (section?.course) {
                    if (!studentData.courseId)
                        practicumUpdateData.courseId = section.course.id;
                    if (!studentData.departmentId)
                        practicumUpdateData.departmentId = section.course.departmentId;
                }
            }
            await practicum.update(practicumUpdateData, { transaction: t });
        }
        else {
            // No existing practicum; create one if sufficient data provided (mirror create flow)
            if (studentData.agencyId && studentData.supervisorId) {
                let sectionIdToUse = studentData.sectionId || null;
                let courseIdToUse = studentData.courseId || null;
                let departmentIdToUse = studentData.departmentId || null;
                // If no section provided, use current enrollment's section
                if (!sectionIdToUse) {
                    const enrollment = await student_enrollment_1.default.findOne({
                        where: { studentId: id },
                        transaction: t,
                    });
                    sectionIdToUse = (enrollment && enrollment.sectionId) || null;
                }
                // Derive course/department from section if missing
                if (sectionIdToUse && (!courseIdToUse || !departmentIdToUse)) {
                    const section = await section_1.default.findByPk(sectionIdToUse, {
                        include: [{ model: course_1.default, as: "course" }],
                        transaction: t,
                    });
                    if (section && section.course) {
                        if (!courseIdToUse)
                            courseIdToUse = section.course.id;
                        if (!departmentIdToUse)
                            departmentIdToUse = section.course.departmentId;
                    }
                }
                await practicum_1.default.create({
                    studentId: id,
                    agencyId: studentData.agencyId,
                    supervisorId: studentData.supervisorId,
                    sectionId: sectionIdToUse || undefined,
                    courseId: courseIdToUse || undefined,
                    departmentId: departmentIdToUse || undefined,
                    position: studentData.position || "Student Intern",
                    startDate: studentData.startDate ? new Date(studentData.startDate) : undefined,
                    endDate: studentData.endDate ? new Date(studentData.endDate) : undefined,
                    totalHours: studentData.totalHours ?? 400,
                    completedHours: 0,
                    workSetup: studentData.workSetup || "On-site",
                    status: "active",
                }, { transaction: t });
            }
        }
    }
    await t.commit();
    return updatedStudent;
};
exports.updateStudentData = updateStudentData;
const deleteStudentData = async (id) => {
    const t = await db_1.default.transaction();
    try {
        const student = await user_1.default.findByPk(id);
        if (!student) {
            await t.rollback();
            throw new error_1.NotFoundError("Student not found.");
        }
        // Soft delete by setting isActive to false
        await student.update({ isActive: false }, { transaction: t });
        await t.commit();
        return student;
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.deleteStudentData = deleteStudentData;
const getStudentsByTeacherData = async (params) => {
    const { teacherId, page, limit, search } = params;
    const offset = (page - 1) * limit;
    // First verify that the teacher exists
    const teacher = await user_1.default.findOne({
        where: { id: teacherId, role: user_1.UserRole.INSTRUCTOR },
    });
    if (!teacher) {
        throw new error_1.NotFoundError("Teacher not found.");
    }
    const whereClause = {
        role: user_1.UserRole.STUDENT,
        isActive: true, // Only include active students
    };
    if (search) {
        whereClause[sequelize_1.Op.or] = [
            { firstName: { [sequelize_1.Op.like]: `%${search}%` } },
            { lastName: { [sequelize_1.Op.like]: `%${search}%` } },
            { email: { [sequelize_1.Op.like]: `%${search}%` } },
            { studentId: { [sequelize_1.Op.like]: `%${search}%` } },
        ];
    }
    try {
        // Query StudentEnrollment with all necessary includes
        const enrollments = await student_enrollment_1.default.findAndCountAll({
            include: [
                {
                    model: user_1.default,
                    as: "student",
                    where: whereClause,
                    include: [
                        {
                            model: department_1.default,
                            as: "department",
                        },
                        {
                            model: practicum_1.default,
                            as: "practicums",
                            include: [
                                {
                                    model: agency_1.default,
                                    as: "agency",
                                },
                                {
                                    model: supervisor_1.default,
                                    as: "supervisor",
                                },
                            ],
                        },
                        {
                            model: requirement_1.default,
                            as: "requirements",
                        },
                        {
                            model: attendance_record_1.default,
                            as: "attendanceRecords",
                        },
                    ],
                },
                {
                    model: section_1.default,
                    as: "section",
                    where: { instructorId: teacherId },
                    include: [
                        {
                            model: course_1.default,
                            as: "course",
                            include: [
                                {
                                    model: department_1.default,
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
                attendance: undefined,
                requirements: undefined,
                reports: undefined,
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
    }
    catch (error) {
        console.error("Error in getStudentsByTeacherData:", error);
        throw error;
    }
};
exports.getStudentsByTeacherData = getStudentsByTeacherData;
