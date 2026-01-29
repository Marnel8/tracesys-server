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
exports.upsertPracticumController = void 0;
const http_status_codes_1 = require("http-status-codes");
const error_1 = require("../../utils/error.js");
const practicum_1 = __importDefault(require("../../db/models/practicum.js"));
const student_enrollment_1 = __importDefault(require("../../db/models/student-enrollment.js"));
const section_1 = __importDefault(require("../../db/models/section.js"));
const course_1 = __importDefault(require("../../db/models/course.js"));
const agency_1 = __importDefault(require("../../db/models/agency.js"));
const supervisor_1 = __importDefault(require("../../db/models/supervisor.js"));
const user_1 = __importStar(require("../../db/models/user.js"));
const db_1 = __importDefault(require("../../db/index.js"));
const upsertPracticumController = async (req, res) => {
    const studentId = req.user?.id;
    if (!studentId) {
        throw new error_1.UnauthorizedError("User not authenticated");
    }
    const { agencyId, supervisorId, startDate, endDate, position = "Student Intern", totalHours = 400, workSetup = "On-site", } = req.body;
    if (!agencyId || !startDate || !endDate) {
        throw new error_1.BadRequestError("agencyId, startDate, and endDate are required");
    }
    const student = await user_1.default.findByPk(studentId);
    if (!student) {
        throw new error_1.NotFoundError("Student not found");
    }
    if (student.role !== user_1.UserRole.STUDENT) {
        throw new error_1.ForbiddenError("Only students can create a practicum assignment");
    }
    const agency = await agency_1.default.findByPk(agencyId);
    if (!agency) {
        throw new error_1.NotFoundError("Agency not found");
    }
    // Only validate supervisor if provided
    if (supervisorId) {
        const supervisor = await supervisor_1.default.findOne({
            where: { id: supervisorId, agencyId },
        });
        if (!supervisor) {
            throw new error_1.NotFoundError("Supervisor not found for the selected agency");
        }
    }
    const transaction = await db_1.default.transaction();
    try {
        const enrollment = await student_enrollment_1.default.findOne({
            where: { studentId },
            include: [
                {
                    model: section_1.default,
                    as: "section",
                    include: [{ model: course_1.default, as: "course" }],
                },
            ],
            order: [["createdAt", "DESC"]],
            transaction,
        });
        if (!enrollment || !enrollment.section) {
            throw new error_1.BadRequestError("Student must be enrolled in a section before creating a practicum");
        }
        const course = enrollment.section.course;
        // Get instructor's OJT hours as default
        let defaultOjtHours = 400;
        if (enrollment.section.instructorId) {
            const instructor = await user_1.default.findByPk(enrollment.section.instructorId, {
                transaction,
            });
            if (instructor && instructor.ojtHours) {
                defaultOjtHours = instructor.ojtHours;
            }
        }
        const existingPracticum = await practicum_1.default.findOne({
            where: { studentId },
            transaction,
        });
        const payload = {
            studentId,
            agencyId,
            sectionId: enrollment.sectionId,
            courseId: course?.id || enrollment.section.courseId || null,
            departmentId: course?.departmentId || null,
            position,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            totalHours: Number(totalHours) || defaultOjtHours,
            workSetup,
            status: "active",
            supervisorId: supervisorId || null, // Allow null to remove supervisor
        };
        let practicum;
        if (existingPracticum) {
            await existingPracticum.update({
                ...payload,
                completedHours: existingPracticum.completedHours ?? 0,
            }, { transaction });
            practicum = existingPracticum;
        }
        else {
            practicum = await practicum_1.default.create({
                ...payload,
                completedHours: 0,
            }, { transaction });
        }
        await transaction.commit();
        const practicumWithRelations = await practicum_1.default.findByPk(practicum.id, {
            include: [
                { model: agency_1.default, as: "agency" },
                { model: supervisor_1.default, as: "supervisor" },
            ],
        });
        res.status(existingPracticum ? http_status_codes_1.StatusCodes.OK : http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: existingPracticum ? "Practicum updated successfully" : "Practicum created successfully",
            data: practicumWithRelations,
        });
    }
    catch (error) {
        await transaction.rollback();
        throw error;
    }
};
exports.upsertPracticumController = upsertPracticumController;
