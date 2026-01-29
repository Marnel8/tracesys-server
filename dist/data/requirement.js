"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDeleteRequirementData = exports.archiveRequirementData = exports.restoreRequirementData = exports.getArchivedRequirementsData = exports.getStudentUnreadCommentsData = exports.getRequirementCommentsData = exports.createRequirementCommentData = exports.getRequirementStatsData = exports.updateRequirementDueDateData = exports.rejectRequirementData = exports.approveRequirementData = exports.updateRequirementFileData = exports.findRequirementByID = exports.getRequirementsData = exports.checkHealthRequirementAccess = exports.createRequirementFromTemplateData = void 0;
const sequelize_1 = require("sequelize");
const requirement_1 = __importDefault(require("../db/models/requirement.js"));
const requirement_template_1 = __importDefault(require("../db/models/requirement-template.js"));
const requirement_comment_1 = __importDefault(require("../db/models/requirement-comment.js"));
const user_1 = __importDefault(require("../db/models/user.js"));
const student_enrollment_1 = __importDefault(require("../db/models/student-enrollment.js"));
const section_1 = __importDefault(require("../db/models/section.js"));
const practicum_1 = __importDefault(require("../db/models/practicum.js"));
const agency_1 = __importDefault(require("../db/models/agency.js"));
const instructor_1 = require("../utils/instructor.js");
const error_1 = require("../utils/error.js");
const createRequirementFromTemplateData = async (params) => {
    const template = await requirement_template_1.default.findByPk(params.templateId);
    if (!template) {
        throw new Error("Requirement template not found");
    }
    const requirement = await requirement_1.default.create({
        studentId: params.studentId,
        templateId: template.id,
        instructorId: params.instructorId ?? null,
        practicumId: params.practicumId ?? null,
        title: template.title,
        description: template.description,
        category: template.category,
        priority: template.priority,
        status: "pending",
        dueDate: params.dueDate ?? null,
    });
    return requirement;
};
exports.createRequirementFromTemplateData = createRequirementFromTemplateData;
/**
 * Check if authenticated user has access to a health requirement
 * - Students: Can only access their own health requirements
 * - Instructors: Can only access health requirements for students in their sections
 * - Admins: Can access all health requirements
 */
const checkHealthRequirementAccess = async (requirement, authUser) => {
    if (!authUser)
        return false;
    const category = (requirement.category || "").toLowerCase();
    if (category !== "health") {
        // Non-health requirements are not restricted
        return true;
    }
    const userRole = authUser.role?.toLowerCase();
    const userId = authUser.id;
    // Admins can access all health requirements
    if (userRole === "admin") {
        return true;
    }
    // Students can only access their own health requirements
    if (userRole === "student") {
        return requirement.studentId === userId;
    }
    // Instructors can only access health requirements for students in their sections
    if (userRole === "instructor") {
        return await (0, instructor_1.instructorOwnsStudent)(userId, requirement.studentId);
    }
    // Default: deny access
    return false;
};
exports.checkHealthRequirementAccess = checkHealthRequirementAccess;
const getRequirementsData = async (params) => {
    const { page, limit, search, status, studentId, practicumId, instructorId, authUser } = params;
    const offset = (page - 1) * limit;
    const where = {};
    const andConditions = [];
    // Exclude archived requirements by default (include active and null for backward compatibility)
    andConditions.push({
        [sequelize_1.Op.or]: [
            { isActive: true },
            { isActive: { [sequelize_1.Op.is]: null } }
        ]
    });
    if (search) {
        andConditions.push({
            [sequelize_1.Op.or]: [
                { title: { [sequelize_1.Op.like]: `%${search}%` } },
                { description: { [sequelize_1.Op.like]: `%${search}%` } },
                { fileName: { [sequelize_1.Op.like]: `%${search}%` } },
                { "$student.firstName$": { [sequelize_1.Op.like]: `%${search}%` } },
                { "$student.lastName$": { [sequelize_1.Op.like]: `%${search}%` } },
                { "$student.email$": { [sequelize_1.Op.like]: `%${search}%` } },
                { "$student.studentId$": { [sequelize_1.Op.like]: `%${search}%` } },
            ],
        });
    }
    if (status && status !== "all") {
        where.status = status;
    }
    else if (status === "all" && instructorId) {
        // When status is "all" and user is instructor, only show requirements with files
        // UNLESS includePending is true (for summary page where we need to see all requirements)
        // This ensures pagination works correctly (no empty pages) for the requirements list page
        const includePending = params.includePending;
        if (!includePending) {
            andConditions.push({
                [sequelize_1.Op.or]: [
                    { fileUrl: { [sequelize_1.Op.ne]: null } },
                    { fileName: { [sequelize_1.Op.ne]: null } },
                ],
            });
        }
    }
    if (studentId) {
        where.studentId = studentId;
    }
    if (practicumId) {
        where.practicumId = practicumId;
    }
    // Apply health requirement access control at query level
    if (authUser) {
        const userRole = authUser.role?.toLowerCase();
        const userId = authUser.id;
        if (userRole === "student") {
            // Students: Can only see health requirements where they are the student
            andConditions.push({
                [sequelize_1.Op.or]: [
                    { category: { [sequelize_1.Op.ne]: "health" } }, // Non-health requirements
                    { studentId: userId }, // Or their own health requirements
                ],
            });
        }
        else if (userRole === "instructor") {
            // Instructors: Can only see health requirements for their students
            // We'll need to filter this after fetching student IDs, but add a base condition
            // For now, we'll handle this in post-processing for instructors
            // The instructorId filter already ensures they only see their students' requirements
            // So we just need to ensure health requirements are included only for their students
        }
        // Admins: No additional filtering needed - they can see all
    }
    // Combine all AND conditions
    if (andConditions.length > 0) {
        where[sequelize_1.Op.and] = andConditions;
    }
    // Ensure students under this instructor have requirement rows for all active templates
    if (instructorId) {
        const [enrollments, allTemplates] = await Promise.all([
            student_enrollment_1.default.findAll({
                attributes: ["studentId"],
                include: [
                    {
                        model: section_1.default,
                        as: "section",
                        attributes: [],
                        where: { instructorId },
                        required: true,
                    },
                ],
                raw: true,
            }),
            requirement_template_1.default.findAll({
                where: { isActive: true },
                raw: true,
            }),
        ]);
        const studentIds = Array.from(new Set(enrollments
            .map((e) => e.studentId)
            .filter((id) => !!id)));
        // Get student practicums with agency information to filter templates
        const practicums = await practicum_1.default.findAll({
            where: {
                studentId: { [sequelize_1.Op.in]: studentIds },
                status: "active",
            },
            include: [
                {
                    model: agency_1.default,
                    as: "agency",
                    attributes: ["id", "isSchoolAffiliated"],
                    required: false,
                },
            ],
        });
        // Create a map of studentId -> agency school affiliation status
        const studentAgencyMap = new Map();
        for (const practicum of practicums) {
            const agency = practicum.agency;
            if (agency) {
                studentAgencyMap.set(practicum.studentId, agency.isSchoolAffiliated || false);
            }
        }
        // Filter templates based on agency school affiliation
        // Logic: If agency isSchoolAffiliated is true, only include templates where appliesToSchoolAffiliated is true
        // If agency isSchoolAffiliated is false/undefined, include all templates
        const templates = allTemplates.filter((tmpl) => {
            // If no practicum/agency info, include all templates (backward compatibility)
            if (studentIds.length === 0)
                return true;
            // For each student, we'll filter when creating requirements
            // Here we just keep all templates that could be applicable
            return true;
        });
        const templateIds = templates.map((t) => t.id).filter(Boolean);
        if (studentIds.length && templateIds.length) {
            const existing = await requirement_1.default.findAll({
                attributes: ["id", "studentId", "templateId", "createdAt"],
                where: {
                    studentId: { [sequelize_1.Op.in]: studentIds },
                    templateId: { [sequelize_1.Op.in]: templateIds },
                    [sequelize_1.Op.or]: [
                        { isActive: true },
                        { isActive: { [sequelize_1.Op.is]: null } } // Include null for backward compatibility
                    ]
                },
                raw: true,
            });
            // Deduplicate legacy rows: keep the newest per (studentId, templateId)
            if (existing.length > 0) {
                const seen = new Map();
                const toDelete = [];
                for (const row of existing) {
                    const key = `${row.studentId}:${row.templateId}`;
                    const createdAt = new Date(row.createdAt);
                    if (!seen.has(key)) {
                        seen.set(key, { id: row.id, createdAt });
                        continue;
                    }
                    const current = seen.get(key);
                    // Keep the newest record, delete the older one
                    if (createdAt > current.createdAt) {
                        toDelete.push(current.id);
                        seen.set(key, { id: row.id, createdAt });
                    }
                    else {
                        toDelete.push(row.id);
                    }
                }
                if (toDelete.length) {
                    await requirement_1.default.destroy({ where: { id: { [sequelize_1.Op.in]: toDelete } } });
                }
            }
            const existingSet = new Set(existing.map((r) => `${r.studentId}:${r.templateId}`));
            const toCreate = [];
            for (const sid of studentIds) {
                const isSchoolAffiliated = studentAgencyMap.get(sid) || false;
                for (const tmpl of allTemplates) {
                    // Filter: If agency is school-affiliated, only include templates that apply to school-affiliated
                    // If agency is NOT school-affiliated, include all templates
                    if (isSchoolAffiliated && !tmpl.appliesToSchoolAffiliated) {
                        continue; // Skip templates that don't apply to school-affiliated agencies
                    }
                    const key = `${sid}:${tmpl.id}`;
                    if (existingSet.has(key))
                        continue;
                    toCreate.push({
                        studentId: sid,
                        templateId: tmpl.id,
                        title: tmpl.title,
                        description: tmpl.description,
                        category: tmpl.category,
                        priority: tmpl.priority,
                        status: "pending",
                        dueDate: null,
                    });
                }
            }
            if (toCreate.length) {
                await requirement_1.default.bulkCreate(toCreate);
            }
        }
    }
    const { count, rows } = await requirement_1.default.findAndCountAll({
        where,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
        subQuery: false,
        distinct: true,
        include: [
            { model: requirement_template_1.default, as: "template" },
            {
                model: user_1.default,
                as: "student",
                attributes: ["id", "firstName", "lastName", "email", "role", "studentId"],
                required: true,
                include: [
                    {
                        model: student_enrollment_1.default,
                        as: "enrollments",
                        attributes: [],
                        required: !!instructorId,
                        include: [
                            {
                                model: section_1.default,
                                as: "section",
                                attributes: [],
                                required: !!instructorId,
                                where: instructorId ? { instructorId } : undefined,
                            },
                        ],
                    },
                ],
            },
        ],
    });
    // Filter health requirements based on access control (post-processing for instructors)
    // This is needed because instructor-student relationships require checking enrollments
    let filteredRows = rows;
    let filteredCount = count;
    if (authUser) {
        const userRole = authUser.role?.toLowerCase();
        // For instructors, we need to verify each health requirement belongs to their students
        if (userRole === "instructor" && instructorId === authUser.id) {
            const accessChecks = await Promise.all(rows.map(async (req) => {
                const category = (req.category || "").toLowerCase();
                if (category === "health") {
                    // Verify this health requirement is for a student in instructor's sections
                    return await (0, exports.checkHealthRequirementAccess)(req, authUser);
                }
                return true; // Non-health requirements are already filtered by instructorId
            }));
            filteredRows = rows.filter((_, index) => accessChecks[index]);
            // Note: Count adjustment would require a separate query, so we use filteredRows.length
            // This may cause slight pagination inconsistencies, but is acceptable for security
            filteredCount = filteredRows.length;
        }
        else {
            // For students and admins, filtering is already done in WHERE clause
            filteredRows = rows;
        }
    }
    return {
        requirements: filteredRows,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(filteredCount / limit),
            totalItems: filteredCount,
            itemsPerPage: limit,
        },
    };
};
exports.getRequirementsData = getRequirementsData;
const findRequirementByID = async (id, authUser) => {
    const req = await requirement_1.default.findByPk(id, {
        include: [
            { model: requirement_template_1.default, as: "template" },
            { model: user_1.default, as: "student", attributes: ["id", "firstName", "lastName", "email", "role"] },
            { model: user_1.default, as: "approver", attributes: ["id", "firstName", "lastName", "email", "role"] },
            {
                model: requirement_comment_1.default,
                as: "comments",
                include: [
                    { model: user_1.default, as: "user", attributes: ["id", "firstName", "lastName", "email", "role"] },
                ],
                order: [["createdAt", "ASC"]],
            },
        ],
    });
    if (!req) {
        return null;
    }
    // Check access for health requirements
    if (authUser) {
        const hasAccess = await (0, exports.checkHealthRequirementAccess)(req, authUser);
        if (!hasAccess) {
            throw new error_1.UnauthorizedError("You do not have permission to access this health-related requirement");
        }
    }
    return req;
};
exports.findRequirementByID = findRequirementByID;
const updateRequirementFileData = async (id, file) => {
    const req = await requirement_1.default.findByPk(id);
    if (!req)
        throw new Error("Requirement not found");
    await req.update({
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        fileSize: file.fileSize,
        submittedDate: new Date(),
        status: "submitted",
    });
    return req;
};
exports.updateRequirementFileData = updateRequirementFileData;
const approveRequirementData = async (id, approverId, feedback) => {
    const req = await requirement_1.default.findByPk(id);
    if (!req)
        throw new Error("Requirement not found");
    await req.update({
        status: "approved",
        approvedBy: approverId,
        approvedDate: new Date(),
        feedback: feedback ?? req.feedback ?? null,
    });
    return req;
};
exports.approveRequirementData = approveRequirementData;
const rejectRequirementData = async (id, approverId, reason) => {
    if (!reason?.trim())
        throw new Error("Rejection reason is required");
    const req = await requirement_1.default.findByPk(id);
    if (!req)
        throw new Error("Requirement not found");
    await req.update({
        status: "rejected",
        approvedBy: approverId,
        approvedDate: null,
        feedback: reason,
    });
    return req;
};
exports.rejectRequirementData = rejectRequirementData;
const updateRequirementDueDateData = async (id, dueDate) => {
    const req = await requirement_1.default.findByPk(id);
    if (!req)
        throw new Error("Requirement not found");
    await req.update({
        dueDate: dueDate,
    });
    return req;
};
exports.updateRequirementDueDateData = updateRequirementDueDateData;
const getRequirementStatsData = async (studentId) => {
    try {
        // Get all requirements for the student (exclude archived)
        const allRequirements = await requirement_1.default.findAndCountAll({
            where: {
                studentId,
                [sequelize_1.Op.or]: [
                    { isActive: true },
                    { isActive: { [sequelize_1.Op.is]: null } } // Include null for backward compatibility
                ]
            },
            include: [
                { model: requirement_template_1.default, as: "template" },
            ],
        });
        const requirements = allRequirements.rows || [];
        // Calculate stats
        const total = requirements.length;
        const approved = requirements.filter(r => r.status === 'approved').length;
        const pending = requirements.filter(r => r.status === 'pending').length;
        const submitted = requirements.filter(r => r.status === 'submitted').length;
        const rejected = requirements.filter(r => r.status === 'rejected').length;
        const inProgress = requirements.filter(r => r.status === 'in-progress').length;
        return {
            total,
            approved,
            pending,
            submitted,
            rejected,
            inProgress,
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to get requirement statistics");
    }
};
exports.getRequirementStatsData = getRequirementStatsData;
const createRequirementCommentData = async (requirementId, userId, content, isPrivate = false) => {
    const requirement = await requirement_1.default.findByPk(requirementId);
    if (!requirement) {
        throw new Error("Requirement not found");
    }
    const comment = await requirement_comment_1.default.create({
        requirementId,
        userId,
        content,
        isPrivate,
    });
    // Fetch the comment with user information
    const commentWithUser = await requirement_comment_1.default.findByPk(comment.id, {
        include: [
            { model: user_1.default, as: "user", attributes: ["id", "firstName", "lastName", "email", "role"] },
            { model: requirement_1.default, as: "requirement", attributes: ["id", "title", "studentId"] },
        ],
    });
    return commentWithUser;
};
exports.createRequirementCommentData = createRequirementCommentData;
const getRequirementCommentsData = async (requirementId) => {
    const requirement = await requirement_1.default.findByPk(requirementId);
    if (!requirement) {
        throw new Error("Requirement not found");
    }
    const comments = await requirement_comment_1.default.findAll({
        where: { requirementId, isPrivate: false },
        include: [
            { model: user_1.default, as: "user", attributes: ["id", "firstName", "lastName", "email", "role"] },
        ],
        order: [["createdAt", "ASC"]],
    });
    return comments;
};
exports.getRequirementCommentsData = getRequirementCommentsData;
const getStudentUnreadCommentsData = async (studentId, lastCheckTime) => {
    // Get all requirements for the student
    const requirements = await requirement_1.default.findAll({
        where: {
            studentId,
            [sequelize_1.Op.or]: [
                { isActive: true },
                { isActive: { [sequelize_1.Op.is]: null } } // Include null for backward compatibility
            ]
        },
        attributes: ["id"],
        raw: true,
    });
    const requirementIds = requirements.map((r) => r.id);
    if (requirementIds.length === 0) {
        return [];
    }
    const whereConditions = {
        requirementId: { [sequelize_1.Op.in]: requirementIds },
        isPrivate: false,
    };
    // If lastCheckTime is provided, only get comments created after that time
    if (lastCheckTime) {
        whereConditions.createdAt = { [sequelize_1.Op.gt]: new Date(lastCheckTime) };
    }
    const comments = await requirement_comment_1.default.findAll({
        where: whereConditions,
        include: [
            { model: user_1.default, as: "user", attributes: ["id", "firstName", "lastName", "email", "role"] },
            {
                model: requirement_1.default,
                as: "requirement",
                attributes: ["id", "title", "studentId"],
            },
        ],
        order: [["createdAt", "DESC"]],
    });
    return comments;
};
exports.getStudentUnreadCommentsData = getStudentUnreadCommentsData;
// Archive functions
const getArchivedRequirementsData = async (params) => {
    const { page, limit, search, authUser } = params;
    const offset = (page - 1) * limit;
    const whereClause = {
        isActive: false, // Only include archived (inactive) requirements
    };
    // Apply health requirement access control
    if (authUser) {
        const userRole = authUser.role?.toLowerCase();
        const userId = authUser.id;
        if (userRole === "student") {
            // Students: Can only see their own archived health requirements
            whereClause[sequelize_1.Op.and] = [
                ...(whereClause[sequelize_1.Op.and] || []),
                {
                    [sequelize_1.Op.or]: [
                        { category: { [sequelize_1.Op.ne]: "health" } },
                        { studentId: userId },
                    ],
                },
            ];
        }
        // Instructors and admins: No additional filtering at query level
        // Will be filtered post-query for instructors
    }
    if (search) {
        whereClause[sequelize_1.Op.or] = [
            { title: { [sequelize_1.Op.like]: `%${search}%` } },
            { description: { [sequelize_1.Op.like]: `%${search}%` } },
            { fileName: { [sequelize_1.Op.like]: `%${search}%` } },
            { "$student.firstName$": { [sequelize_1.Op.like]: `%${search}%` } },
            { "$student.lastName$": { [sequelize_1.Op.like]: `%${search}%` } },
            { "$student.email$": { [sequelize_1.Op.like]: `%${search}%` } },
            { "$student.studentId$": { [sequelize_1.Op.like]: `%${search}%` } },
        ];
    }
    const { count, rows: requirements } = await requirement_1.default.findAndCountAll({
        where: whereClause,
        include: [
            {
                model: user_1.default,
                as: "student",
                attributes: ["id", "firstName", "lastName", "email", "studentId"],
            },
            {
                model: user_1.default,
                as: "instructor",
                attributes: ["id", "firstName", "lastName", "email"],
            },
        ],
        limit,
        offset,
        order: [["updatedAt", "DESC"]], // Order by updatedAt (deletion time)
    });
    // Filter health requirements for instructors
    let filteredRequirements = requirements;
    let filteredCount = count;
    if (authUser) {
        const userRole = authUser.role?.toLowerCase();
        if (userRole === "instructor") {
            const accessChecks = await Promise.all(requirements.map(async (req) => {
                const category = (req.category || "").toLowerCase();
                if (category === "health") {
                    return await (0, exports.checkHealthRequirementAccess)(req, authUser);
                }
                return true; // Non-health requirements are accessible
            }));
            filteredRequirements = requirements.filter((_, index) => accessChecks[index]);
            filteredCount = filteredRequirements.length;
        }
    }
    // Look up who deleted each requirement from audit logs (if available)
    const requirementIds = filteredRequirements.map((r) => r.id);
    let deletedByMap = {};
    // Note: Audit logging for requirement deletion would need to be implemented
    // For now, we'll use instructor info if available, or "Unknown"
    for (const req of filteredRequirements) {
        const reqData = req.toJSON();
        if (reqData.instructor) {
            const instructor = reqData.instructor;
            deletedByMap[req.id] = `${instructor.firstName || ""} ${instructor.lastName || ""}`.trim() || instructor.email || "Unknown";
        }
        else {
            deletedByMap[req.id] = "Unknown";
        }
    }
    // Transform to archive format
    const items = filteredRequirements.map((requirement) => {
        const reqData = requirement.toJSON();
        return {
            id: requirement.id,
            type: "requirement",
            name: requirement.title,
            deletedAt: requirement.updatedAt.toISOString(),
            deletedBy: deletedByMap[requirement.id] ?? null,
            meta: {
                studentName: reqData.student ? `${reqData.student.firstName || ""} ${reqData.student.lastName || ""}`.trim() : null,
                studentEmail: reqData.student?.email || null,
                status: requirement.status,
            },
            raw: reqData,
        };
    });
    return {
        items,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(filteredCount / limit),
            totalItems: filteredCount,
            itemsPerPage: limit,
        },
    };
};
exports.getArchivedRequirementsData = getArchivedRequirementsData;
const restoreRequirementData = async (id) => {
    const sequelize = requirement_1.default.sequelize;
    const t = await sequelize.transaction();
    try {
        const requirement = await requirement_1.default.findOne({
            where: { id, isActive: false },
            transaction: t,
        });
        if (!requirement) {
            await t.rollback();
            throw new Error("Archived requirement not found");
        }
        // Restore by setting isActive to true
        await requirement.update({ isActive: true }, { transaction: t });
        await t.commit();
        // Fetch the full requirement with associations
        const restored = await requirement_1.default.findByPk(id, {
            include: [
                {
                    model: user_1.default,
                    as: "student",
                    attributes: ["id", "firstName", "lastName", "email", "studentId"],
                },
                {
                    model: user_1.default,
                    as: "instructor",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
            ],
        });
        return restored;
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.restoreRequirementData = restoreRequirementData;
const archiveRequirementData = async (id) => {
    const sequelize = requirement_1.default.sequelize;
    const t = await sequelize.transaction();
    try {
        const requirement = await requirement_1.default.findOne({
            where: {
                id,
                [sequelize_1.Op.or]: [
                    { isActive: true },
                    { isActive: { [sequelize_1.Op.is]: null } } // Include null for backward compatibility
                ]
            },
            transaction: t,
        });
        if (!requirement) {
            await t.rollback();
            throw new Error("Requirement not found");
        }
        // Archive by setting isActive to false
        await requirement.update({ isActive: false }, { transaction: t });
        await t.commit();
        return requirement;
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.archiveRequirementData = archiveRequirementData;
const hardDeleteRequirementData = async (id) => {
    const sequelize = requirement_1.default.sequelize;
    const t = await sequelize.transaction();
    try {
        const requirement = await requirement_1.default.findOne({
            where: { id, isActive: false },
            transaction: t,
        });
        if (!requirement) {
            await t.rollback();
            throw new Error("Archived requirement not found");
        }
        // Delete related comments first
        await requirement_comment_1.default.destroy({
            where: { requirementId: id },
            transaction: t,
        });
        // Then delete the requirement
        await requirement.destroy({ transaction: t });
        await t.commit();
        return { success: true };
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.hardDeleteRequirementData = hardDeleteRequirementData;
