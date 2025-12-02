"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.instructorOwnsStudent = instructorOwnsStudent;
exports.getInstructorStudentIds = getInstructorStudentIds;
const student_enrollment_1 = __importDefault(require("../db/models/student-enrollment.js"));
const section_1 = __importDefault(require("../db/models/section.js"));
// Returns true if the given student is under the instructor's supervision via any section
async function instructorOwnsStudent(instructorId, studentId) {
    const enrollment = await student_enrollment_1.default.findOne({
        where: { studentId },
        include: [
            {
                model: section_1.default,
                as: "section",
                attributes: ["id"],
                required: true,
                where: { instructorId },
            },
        ],
    });
    return !!enrollment;
}
// Get all student IDs under an instructor's supervision
async function getInstructorStudentIds(instructorId) {
    try {
        const enrollments = await student_enrollment_1.default.findAll({
            attributes: ["studentId"],
            include: [
                {
                    model: section_1.default,
                    as: "section",
                    attributes: [],
                    required: true,
                    where: { instructorId },
                },
            ],
        });
        return enrollments.map((enrollment) => enrollment.studentId).filter(Boolean);
    }
    catch (error) {
        console.error("Error fetching instructor student IDs:", error);
        return [];
    }
}
