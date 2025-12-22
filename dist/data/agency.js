"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgencySupervisorStats = exports.deleteSupervisorData = exports.updateSupervisorData = exports.findSupervisorByID = exports.getSupervisorsData = exports.createSupervisorData = exports.hardDeleteAgencyData = exports.restoreAgencyData = exports.getArchivedAgenciesData = exports.deleteAgencyData = exports.updateAgencyData = exports.findAgencyByID = exports.getAgenciesData = exports.createAgencyData = void 0;
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../db/index.js"));
const agency_1 = __importDefault(require("../db/models/agency.js"));
const supervisor_1 = __importDefault(require("../db/models/supervisor.js"));
const practicum_1 = __importDefault(require("../db/models/practicum.js"));
const user_1 = __importDefault(require("../db/models/user.js"));
const audit_log_1 = __importDefault(require("../db/models/audit-log.js"));
const error_1 = require("../utils/error.js");
const createAgencyData = async (data) => {
    try {
        // Check if agency with same name already exists
        const existingAgency = await agency_1.default.findOne({
            where: {
                name: data.name,
            },
        });
        if (existingAgency) {
            throw new Error("Agency with this name already exists");
        }
        const agency = await agency_1.default.create(data);
        return {
            agency,
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to create agency");
    }
};
exports.createAgencyData = createAgencyData;
const getAgenciesData = async (params) => {
    try {
        const { page, limit, search, status, branchType, instructorId } = params;
        const offset = (page - 1) * limit;
        // Build where clause
        const whereClause = {};
        // Filter by instructorId if provided (each instructor should only see their own agencies)
        if (instructorId) {
            whereClause.instructorId = instructorId;
        }
        if (search) {
            whereClause[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: `%${search}%` } },
                { contactPerson: { [sequelize_1.Op.like]: `%${search}%` } },
                { contactEmail: { [sequelize_1.Op.like]: `%${search}%` } },
            ];
        }
        // When status is "all", default to showing only active agencies (exclude archived ones)
        // When status is "active", show only active agencies
        // When status is "inactive", show inactive agencies
        if (status && status !== "all") {
            whereClause.isActive = status === "active";
        }
        else {
            // Default to active agencies when status is "all" to exclude archived ones
            whereClause.isActive = true;
        }
        if (branchType && branchType !== "all") {
            whereClause.branchType = branchType;
        }
        const { count, rows: agencies } = await agency_1.default.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [["createdAt", "DESC"]],
            include: [
                {
                    model: supervisor_1.default,
                    as: "supervisors",
                    where: { isActive: true },
                    required: false,
                    attributes: ["id", "name", "email", "position", "isActive"],
                },
                {
                    model: practicum_1.default,
                    as: "practicums",
                    where: { status: "active" },
                    required: false,
                    attributes: ["id", "status", "position", "startDate", "endDate", "totalHours", "completedHours", "studentId"],
                    include: [
                        {
                            model: user_1.default,
                            as: "student",
                            required: false,
                            attributes: ["id", "firstName", "lastName", "studentId", "email"],
                        },
                    ],
                },
            ],
        });
        const totalPages = Math.ceil(count / limit);
        return {
            agencies,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count,
                itemsPerPage: limit,
            },
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to retrieve agencies");
    }
};
exports.getAgenciesData = getAgenciesData;
const findAgencyByID = async (id) => {
    try {
        const agency = await agency_1.default.findByPk(id, {
            include: [
                {
                    model: supervisor_1.default,
                    as: "supervisors",
                    where: { isActive: true },
                    required: false,
                    attributes: ["id", "name", "email", "phone", "position", "department", "isActive", "createdAt"],
                },
                {
                    model: practicum_1.default,
                    as: "practicums",
                    where: { status: "active" },
                    required: false,
                    attributes: ["id", "status", "position", "startDate", "endDate", "totalHours", "completedHours", "workSetup", "studentId"],
                    include: [
                        {
                            model: user_1.default,
                            as: "student",
                            required: false,
                            attributes: ["id", "firstName", "lastName", "studentId", "email"],
                        },
                    ],
                },
            ],
        });
        return agency;
    }
    catch (error) {
        throw new Error(error.message || "Failed to find agency");
    }
};
exports.findAgencyByID = findAgencyByID;
const updateAgencyData = async (id, updateData) => {
    try {
        const agency = await agency_1.default.findByPk(id);
        if (!agency) {
            throw new Error("Agency not found");
        }
        // Check if name is being updated and if it conflicts with existing agency
        if (updateData.name && updateData.name !== agency.name) {
            const existingAgency = await agency_1.default.findOne({
                where: {
                    name: updateData.name,
                    id: { [sequelize_1.Op.ne]: id },
                },
            });
            if (existingAgency) {
                throw new Error("Agency with this name already exists");
            }
        }
        await agency.update(updateData);
        return agency;
    }
    catch (error) {
        throw new Error(error.message || "Failed to update agency");
    }
};
exports.updateAgencyData = updateAgencyData;
const deleteAgencyData = async (id) => {
    try {
        const agency = await agency_1.default.findByPk(id);
        if (!agency) {
            throw new Error("Agency not found");
        }
        // Check if agency has active practicums
        const activePracticums = await practicum_1.default.count({
            where: {
                agencyId: id,
                status: "active",
            },
        });
        if (activePracticums > 0) {
            throw new Error("Cannot delete agency with active practicums");
        }
        // Soft delete by setting isActive to false
        await agency.update({ isActive: false });
        return agency;
    }
    catch (error) {
        throw new Error(error.message || "Failed to delete agency");
    }
};
exports.deleteAgencyData = deleteAgencyData;
const getArchivedAgenciesData = async (params) => {
    try {
        const { page, limit, search } = params;
        const offset = (page - 1) * limit;
        const whereClause = {
            isActive: false, // Only include archived (inactive) agencies
        };
        if (search) {
            whereClause[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: `%${search}%` } },
                { contactPerson: { [sequelize_1.Op.like]: `%${search}%` } },
                { contactEmail: { [sequelize_1.Op.like]: `%${search}%` } },
            ];
        }
        const { count, rows: agencies } = await agency_1.default.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [["updatedAt", "DESC"]], // Order by updatedAt (deletion time)
        });
        // Look up who deleted each agency from the audit logs
        const agencyIds = agencies.map((a) => a.id);
        let deletedByMap = {};
        if (agencyIds.length > 0) {
            const deletionLogs = await audit_log_1.default.findAll({
                where: {
                    resource: "Agency Management",
                    action: "Agency Deleted",
                    resourceId: { [sequelize_1.Op.in]: agencyIds },
                },
                include: [
                    {
                        model: user_1.default,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "email"],
                    },
                ],
                order: [["createdAt", "DESC"]],
            });
            for (const log of deletionLogs) {
                const aid = log.resourceId;
                if (!aid)
                    continue;
                if (deletedByMap[aid])
                    continue;
                const deleter = log.user;
                if (deleter) {
                    const fullName = `${deleter.firstName ?? ""} ${deleter.lastName ?? ""}`.trim();
                    deletedByMap[aid] = fullName || deleter.email || "Unknown";
                }
                else {
                    deletedByMap[aid] = "Unknown";
                }
            }
        }
        // Transform to archive format
        const items = agencies.map((agency) => ({
            id: agency.id,
            type: "agency",
            name: agency.name,
            deletedAt: agency.updatedAt.toISOString(),
            deletedBy: deletedByMap[agency.id] ?? null,
            meta: {
                contactPerson: agency.contactPerson,
                contactEmail: agency.contactEmail,
                branchType: agency.branchType,
            },
            raw: agency.toJSON(),
        }));
        return {
            items,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: limit,
            },
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to retrieve archived agencies");
    }
};
exports.getArchivedAgenciesData = getArchivedAgenciesData;
const restoreAgencyData = async (id) => {
    const t = await db_1.default.transaction();
    try {
        const agency = await agency_1.default.findOne({
            where: { id, isActive: false },
            transaction: t,
        });
        if (!agency) {
            await t.rollback();
            throw new error_1.NotFoundError("Archived agency not found.");
        }
        // Restore by setting isActive to true
        await agency.update({ isActive: true }, { transaction: t });
        await t.commit();
        return agency;
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.restoreAgencyData = restoreAgencyData;
const hardDeleteAgencyData = async (id) => {
    const t = await db_1.default.transaction();
    try {
        const agency = await agency_1.default.findOne({
            where: { id, isActive: false },
            transaction: t,
        });
        if (!agency) {
            await t.rollback();
            throw new error_1.NotFoundError("Archived agency not found.");
        }
        // Check if agency has any practicums
        const practicumCount = await practicum_1.default.count({
            where: { agencyId: id },
            transaction: t,
        });
        if (practicumCount > 0) {
            await t.rollback();
            throw new Error("Cannot permanently delete agency with associated practicums");
        }
        // Delete related supervisors
        await supervisor_1.default.destroy({
            where: { agencyId: id },
            transaction: t,
        });
        // Finally, delete the agency
        await agency.destroy({ transaction: t });
        await t.commit();
        return { success: true };
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.hardDeleteAgencyData = hardDeleteAgencyData;
// Supervisor Management Functions
const createSupervisorData = async (data) => {
    try {
        // Check if agency exists
        const agency = await agency_1.default.findByPk(data.agencyId);
        if (!agency) {
            throw new Error("Agency not found");
        }
        // Check if supervisor with same email already exists in this agency
        const existingSupervisor = await supervisor_1.default.findOne({
            where: {
                agencyId: data.agencyId,
                email: data.email,
            },
        });
        if (existingSupervisor) {
            throw new Error("Supervisor with this email already exists in this agency");
        }
        const supervisor = await supervisor_1.default.create(data);
        return {
            supervisor,
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to create supervisor");
    }
};
exports.createSupervisorData = createSupervisorData;
const getSupervisorsData = async (params) => {
    try {
        const { agencyId, page, limit, search, status } = params;
        const offset = (page - 1) * limit;
        // Check if agency exists
        const agency = await agency_1.default.findByPk(agencyId);
        if (!agency) {
            throw new Error("Agency not found");
        }
        // Build where clause
        const whereClause = {
            agencyId,
        };
        if (search) {
            whereClause[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: `%${search}%` } },
                { email: { [sequelize_1.Op.like]: `%${search}%` } },
                { position: { [sequelize_1.Op.like]: `%${search}%` } },
                { department: { [sequelize_1.Op.like]: `%${search}%` } },
            ];
        }
        if (status && status !== "all") {
            whereClause.isActive = status === "active";
        }
        const { count, rows: supervisors } = await supervisor_1.default.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [["createdAt", "DESC"]],
            include: [
                {
                    model: agency_1.default,
                    as: "agency",
                    attributes: ["id", "name"],
                },
            ],
        });
        const totalPages = Math.ceil(count / limit);
        return {
            supervisors,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count,
                itemsPerPage: limit,
            },
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to retrieve supervisors");
    }
};
exports.getSupervisorsData = getSupervisorsData;
const findSupervisorByID = async (id) => {
    try {
        const supervisor = await supervisor_1.default.findByPk(id, {
            include: [
                {
                    model: agency_1.default,
                    as: "agency",
                    attributes: ["id", "name", "address"],
                },
            ],
        });
        return supervisor;
    }
    catch (error) {
        throw new Error(error.message || "Failed to find supervisor");
    }
};
exports.findSupervisorByID = findSupervisorByID;
const updateSupervisorData = async (id, updateData) => {
    try {
        const supervisor = await supervisor_1.default.findByPk(id);
        if (!supervisor) {
            throw new Error("Supervisor not found");
        }
        // Check if email is being updated and if it conflicts with existing supervisor
        if (updateData.email && updateData.email !== supervisor.email) {
            const existingSupervisor = await supervisor_1.default.findOne({
                where: {
                    email: updateData.email,
                    agencyId: supervisor.agencyId,
                    id: { [sequelize_1.Op.ne]: id },
                },
            });
            if (existingSupervisor) {
                throw new Error("Supervisor with this email already exists in this agency");
            }
        }
        await supervisor.update(updateData);
        return supervisor;
    }
    catch (error) {
        throw new Error(error.message || "Failed to update supervisor");
    }
};
exports.updateSupervisorData = updateSupervisorData;
const deleteSupervisorData = async (id) => {
    try {
        const supervisor = await supervisor_1.default.findByPk(id);
        if (!supervisor) {
            throw new Error("Supervisor not found");
        }
        // Check if supervisor has active practicums
        const activePracticums = await practicum_1.default.count({
            where: {
                supervisorId: id,
                status: "active",
            },
        });
        if (activePracticums > 0) {
            throw new Error("Cannot delete supervisor with active practicums");
        }
        await supervisor.destroy();
        return true;
    }
    catch (error) {
        throw new Error(error.message || "Failed to delete supervisor");
    }
};
exports.deleteSupervisorData = deleteSupervisorData;
const getAgencySupervisorStats = async (agencyId) => {
    try {
        // Check if agency exists
        const agency = await agency_1.default.findByPk(agencyId);
        if (!agency) {
            throw new Error("Agency not found");
        }
        const totalSupervisors = await supervisor_1.default.count({
            where: { agencyId },
        });
        const activeSupervisors = await supervisor_1.default.count({
            where: { agencyId, isActive: true },
        });
        const inactiveSupervisors = totalSupervisors - activeSupervisors;
        const supervisorsWithPracticums = await supervisor_1.default.count({
            where: {
                agencyId,
                isActive: true,
            },
            include: [
                {
                    model: practicum_1.default,
                    as: "practicums",
                    where: { status: "active" },
                    required: true,
                },
            ],
        });
        return {
            totalSupervisors,
            activeSupervisors,
            inactiveSupervisors,
            supervisorsWithPracticums,
            supervisorsWithoutPracticums: activeSupervisors - supervisorsWithPracticums,
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to get supervisor statistics");
    }
};
exports.getAgencySupervisorStats = getAgencySupervisorStats;
