"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteInvitationController = exports.getInvitationsController = exports.validateInvitationController = exports.createBulkInvitationsController = exports.createInvitationController = void 0;
const http_status_codes_1 = require("http-status-codes");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const error_1 = require("../../utils/error.js");
const invitation_1 = require("../../data/invitation.js");
const send_mail_1 = __importDefault(require("../../utils/send-mail.js"));
const department_1 = __importDefault(require("../../db/models/department.js"));
const section_1 = __importDefault(require("../../db/models/section.js"));
require("dotenv/config");
const departmentNameCache = new Map();
const sectionNameCache = new Map();
const projectRoot = process.cwd();
const candidateAssetDirs = [
    path_1.default.join(projectRoot, "assets"),
    path_1.default.join(projectRoot, "src", "assets"),
    path_1.default.join(projectRoot, "dist", "assets"),
];
const assetsDir = candidateAssetDirs.find((p) => fs_1.default.existsSync(p)) || candidateAssetDirs[0];
const getDepartmentName = async (id) => {
    if (!id)
        return undefined;
    if (departmentNameCache.has(id)) {
        return departmentNameCache.get(id) || undefined;
    }
    const department = await department_1.default.findByPk(id);
    const name = department?.name || null;
    departmentNameCache.set(id, name);
    return name || undefined;
};
const getSectionName = async (id) => {
    if (!id)
        return undefined;
    if (sectionNameCache.has(id)) {
        return sectionNameCache.get(id) || undefined;
    }
    const section = await section_1.default.findByPk(id);
    const name = section?.name || null;
    sectionNameCache.set(id, name);
    return name || undefined;
};
const createInvitationController = async (req, res) => {
    const { email, role, departmentId, sectionId, program, expiresInDays, } = req.body;
    const instructorId = req.user?.id;
    if (!instructorId) {
        throw new error_1.BadRequestError("User not authenticated.");
    }
    if (!email || !role) {
        throw new error_1.BadRequestError("Email and role are required.");
    }
    if (role !== "student" && role !== "instructor") {
        throw new error_1.BadRequestError("Role must be either 'student' or 'instructor'.");
    }
    const invitation = await (0, invitation_1.createInvitation)({
        email,
        role,
        departmentId,
        sectionId,
        program,
        createdBy: instructorId,
        expiresInDays,
    });
    // Build invitation URL with embedded IDs
    const baseUrl = process.env.CLIENT_URL ||
        process.env.FRONTEND_URL ||
        "http://localhost:3000";
    const invitationUrl = new URL(`/invitation/accept/${invitation.token}`, baseUrl);
    if (departmentId)
        invitationUrl.searchParams.set("departmentId", departmentId);
    if (sectionId)
        invitationUrl.searchParams.set("sectionId", sectionId);
    if (program)
        invitationUrl.searchParams.set("program", program);
    const departmentName = await getDepartmentName(departmentId);
    const sectionName = await getSectionName(sectionId);
    // Prepare attachments (only if logo exists)
    const attachments = [];
    const logoPath = path_1.default.join(assetsDir, "logo.png");
    if (fs_1.default.existsSync(logoPath)) {
        attachments.push({
            filename: "logo.png",
            path: logoPath,
            cid: "logo",
        });
    }
    // Send invitation email
    let emailSent = false;
    let emailError = null;
    try {
        await (0, send_mail_1.default)({
            email: email,
            subject: `Invitation to join TracèSys as ${role}`,
            template: "invitation-mail.ejs",
            data: {
                email,
                role,
                invitationUrl: invitationUrl.toString(),
                departmentId,
                departmentName,
                sectionId,
                sectionName,
                program,
                expiresInDays: expiresInDays || 7,
            },
            attachments: attachments.length > 0 ? attachments : undefined,
        });
        emailSent = true;
        console.log(`Invitation email sent successfully to ${email}`);
    }
    catch (error) {
        emailError = error;
        console.error(`Failed to send invitation email to ${email}:`, error);
        // Log detailed error information
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
    }
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: emailSent
            ? "Invitation created and sent successfully"
            : "Invitation created but email failed to send",
        data: {
            invitation,
            invitationUrl: invitationUrl.toString(),
            emailSent,
            ...(emailError && {
                emailError: emailError instanceof Error ? emailError.message : "Unknown error",
            }),
        },
    });
};
exports.createInvitationController = createInvitationController;
const createBulkInvitationsController = async (req, res) => {
    const { emails, role, departmentId, sectionId, program, expiresInDays, } = req.body;
    const instructorId = req.user?.id;
    if (!instructorId) {
        throw new error_1.BadRequestError("User not authenticated.");
    }
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
        throw new error_1.BadRequestError("At least one email address is required.");
    }
    if (!role || (role !== "student" && role !== "instructor")) {
        throw new error_1.BadRequestError("Role must be either 'student' or 'instructor'.");
    }
    const invitations = await (0, invitation_1.createBulkInvitations)({
        emails,
        role,
        departmentId,
        sectionId,
        program,
        createdBy: instructorId,
        expiresInDays,
    });
    // Send invitation emails
    const baseUrl = process.env.CLIENT_URL ||
        process.env.FRONTEND_URL ||
        "http://localhost:3000";
    // Prepare attachments (only if logo exists)
    const attachments = [];
    const logoPath = path_1.default.join(assetsDir, "logo.png");
    if (fs_1.default.existsSync(logoPath)) {
        attachments.push({
            filename: "logo.png",
            path: logoPath,
            cid: "logo",
        });
    }
    const emailResults = await Promise.allSettled(invitations.map(async (invitation) => {
        const deptName = await getDepartmentName(invitation.departmentId || departmentId);
        const secName = await getSectionName(invitation.sectionId || sectionId);
        const invitationUrl = new URL(`/invitation/accept/${invitation.token}`, baseUrl);
        if (departmentId)
            invitationUrl.searchParams.set("departmentId", departmentId);
        if (sectionId)
            invitationUrl.searchParams.set("sectionId", sectionId);
        if (program)
            invitationUrl.searchParams.set("program", program);
        try {
            await (0, send_mail_1.default)({
                email: invitation.email,
                subject: `Invitation to join TracèSys as ${role}`,
                template: "invitation-mail.ejs",
                data: {
                    email: invitation.email,
                    role,
                    invitationUrl: invitationUrl.toString(),
                    departmentId: invitation.departmentId || departmentId,
                    departmentName: deptName,
                    sectionId: invitation.sectionId || sectionId,
                    sectionName: secName,
                    program,
                    expiresInDays: expiresInDays || 7,
                },
                attachments: attachments.length > 0 ? attachments : undefined,
            });
            console.log(`Invitation email sent successfully to ${invitation.email}`);
            return { email: invitation.email, success: true };
        }
        catch (error) {
            console.error(`Failed to send invitation email to ${invitation.email}:`, error);
            if (error instanceof Error) {
                console.error("Error message:", error.message);
            }
            return {
                email: invitation.email,
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }));
    const successful = emailResults.filter((result) => result.status === "fulfilled" && result.value.success).length;
    const failed = emailResults.filter((result) => result.status === "rejected" ||
        (result.status === "fulfilled" && !result.value.success));
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: failed.length > 0
            ? `${successful} invitation(s) sent successfully, ${failed.length} failed`
            : `${invitations.length} invitation(s) created and sent successfully`,
        data: {
            invitations,
            count: invitations.length,
            emailStats: {
                total: invitations.length,
                successful,
                failed: failed.length,
                ...(failed.length > 0 && {
                    failedEmails: failed.map((f) => f.status === "fulfilled" ? f.value.email : "unknown"),
                }),
            },
        },
    });
};
exports.createBulkInvitationsController = createBulkInvitationsController;
const validateInvitationController = async (req, res) => {
    const { token } = req.params;
    if (!token) {
        throw new error_1.BadRequestError("Invitation token is required.");
    }
    const invitation = await (0, invitation_1.validateInvitationToken)(token);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Invitation is valid",
        data: invitation,
    });
};
exports.validateInvitationController = validateInvitationController;
const getInvitationsController = async (req, res) => {
    const instructorId = req.user?.id;
    const { status, limit, offset, search } = req.query;
    if (!instructorId) {
        throw new error_1.BadRequestError("User not authenticated.");
    }
    const result = await (0, invitation_1.getInvitationsByInstructor)(instructorId, {
        status: status,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        search: search ? String(search) : undefined,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Invitations retrieved successfully",
        data: result,
    });
};
exports.getInvitationsController = getInvitationsController;
const deleteInvitationController = async (req, res) => {
    const { id } = req.params;
    const instructorId = req.user?.id;
    if (!instructorId) {
        throw new error_1.BadRequestError("User not authenticated.");
    }
    if (!id) {
        throw new error_1.BadRequestError("Invitation ID is required.");
    }
    await (0, invitation_1.deleteInvitation)(id, instructorId);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Invitation deleted successfully",
    });
};
exports.deleteInvitationController = deleteInvitationController;
