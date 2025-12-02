"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStudentController = exports.updateStudentController = exports.getStudentController = exports.getStudentsByTeacherController = exports.getStudentsController = exports.createStudentController = void 0;
const http_status_codes_1 = require("http-status-codes");
const error_1 = require("../../utils/error.js");
const student_1 = require("../../data/student.js");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const send_mail_1 = __importDefault(require("../../utils/send-mail.js"));
const createStudentController = async (req, res) => {
    const { firstName, lastName, middleName, email, phone, age, gender, studentId, department, course, section, year, semester, agency, agencyAddress, supervisor, supervisorEmail, supervisorPhone, startDate, endDate, password, sendCredentials = true, } = req.body;
    if (!firstName || !lastName || !email || !phone || !age || !gender || !studentId || !password) {
        throw new error_1.BadRequestError("Please provide all necessary data.");
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
        gender: typeof gender === "string" ? gender.toLowerCase() : gender,
        studentId,
        password,
        avatar,
        department,
        course,
        section,
        year,
        semester,
        // Only include practicum data if provided
        ...(agency && { agency }),
        ...(agencyAddress && { agencyAddress }),
        ...(supervisor && { supervisor }),
        ...(supervisorEmail && { supervisorEmail }),
        ...(supervisorPhone && { supervisorPhone }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        sendCredentials,
    };
    const result = await (0, student_1.createStudentData)(studentData);
    // Send credentials email if requested
    if (sendCredentials) {
        await sendStudentCredentials(result.user, password);
    }
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: "Student created successfully",
        data: result,
    });
};
exports.createStudentController = createStudentController;
const getStudentsController = async (req, res) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    const result = await (0, student_1.getStudentsData)({
        page: Number(page),
        limit: Number(limit),
        search: search,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        data: result,
    });
};
exports.getStudentsController = getStudentsController;
const getStudentsByTeacherController = async (req, res) => {
    const { teacherId } = req.params;
    const { page = 1, limit = 10, search = "" } = req.query;
    if (!teacherId) {
        throw new error_1.BadRequestError("Teacher ID is required.");
    }
    const result = await (0, student_1.getStudentsByTeacherData)({
        teacherId,
        page: Number(page),
        limit: Number(limit),
        search: search,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        data: result,
    });
};
exports.getStudentsByTeacherController = getStudentsByTeacherController;
const getStudentController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Student ID is required.");
    }
    const student = await (0, student_1.findStudentByID)(id);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        data: student,
    });
};
exports.getStudentController = getStudentController;
const updateStudentController = async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, middleName, email, phone, age, gender, address, bio, studentId, 
    // Academic Information
    departmentId, courseId, sectionId, yearLevel, program, 
    // Practicum Information
    agencyId, supervisorId, position, startDate, endDate, totalHours, workSetup, } = req.body;
    if (!id) {
        throw new error_1.BadRequestError("Student ID is required.");
    }
    // Handle avatar upload if provided - use Cloudinary URL if available
    const avatar = req.cloudUrls && req.cloudUrls.length > 0 ? req.cloudUrls[0] : undefined;
    const updateData = {
        // Personal Information
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(middleName !== undefined && { middleName }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(age !== undefined && { age }),
        ...(gender && { gender: typeof gender === "string" ? gender.toLowerCase() : gender }),
        ...(address !== undefined && { address }),
        ...(bio !== undefined && { bio }),
        ...(studentId !== undefined && { studentId }),
        ...(avatar && { avatar }),
        // Academic Information
        ...(departmentId && { departmentId }),
        ...(courseId && { courseId }),
        ...(sectionId && { sectionId }),
        ...(yearLevel && { yearLevel }),
        ...(program && { program }),
        // Practicum Information
        ...(agencyId && { agencyId }),
        ...(supervisorId && { supervisorId }),
        ...(position && { position }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(totalHours !== undefined && { totalHours }),
        ...(workSetup && { workSetup }),
    };
    const updatedStudent = await (0, student_1.updateStudentData)(id, updateData);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Student updated successfully",
        data: updatedStudent,
    });
};
exports.updateStudentController = updateStudentController;
const deleteStudentController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new error_1.BadRequestError("Student ID is required.");
        }
        await (0, student_1.deleteStudentData)(id);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Student deactivated successfully",
        });
    }
    catch (error) {
        res.status(error.statusCode || http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || "Failed to delete student",
        });
    }
};
exports.deleteStudentController = deleteStudentController;
// Helper function to send student credentials
const sendStudentCredentials = async (user, password) => {
    try {
        const projectRoot = process.cwd();
        const candidateAssetDirs = [
            path_1.default.join(projectRoot, "assets"),
            path_1.default.join(projectRoot, "src", "assets"),
            path_1.default.join(projectRoot, "dist", "assets"),
        ];
        const assetsDir = candidateAssetDirs.find((p) => fs_1.default.existsSync(p)) || candidateAssetDirs[0];
        await (0, send_mail_1.default)({
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
                    path: path_1.default.join(assetsDir, "logo.png"),
                    cid: "logo",
                },
            ],
        });
    }
    catch (error) {
        console.error("Failed to send student credentials:", error);
        // Don't throw error here as student creation was successful
    }
};
