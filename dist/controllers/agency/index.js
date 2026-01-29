"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgencySupervisorStatsController = exports.deleteSupervisorController = exports.updateSupervisorController = exports.getSupervisorController = exports.getSupervisorsController = exports.createSupervisorController = exports.hardDeleteAgencyController = exports.restoreAgencyController = exports.getArchivedAgenciesController = exports.deleteAgencyController = exports.updateAgencyController = exports.getAgencyController = exports.getAgenciesController = exports.createAgencyController = void 0;
const http_status_codes_1 = require("http-status-codes");
const error_1 = require("../../utils/error.js");
const agency_1 = require("../../data/agency.js");
const audit_1 = require("../../middlewares/audit.js");
const createAgencyController = async (req, res) => {
    const { name, address, contactPerson, contactRole, contactPhone, contactEmail, branchType, openingTime, closingTime, operatingDays, lunchStartTime, lunchEndTime, isActive = true, latitude, longitude, isSchoolAffiliated = false, } = req.body;
    if (!name || !address || !contactPerson || !contactRole || !contactPhone || !contactEmail || !branchType) {
        throw new error_1.BadRequestError("Please provide all necessary agency data.");
    }
    // Get the instructor ID from the authenticated user
    const instructorId = req.user?.id;
    const agencyData = {
        name,
        address,
        contactPerson,
        contactRole,
        contactPhone,
        contactEmail,
        branchType,
        openingTime,
        closingTime,
        operatingDays,
        lunchStartTime,
        lunchEndTime,
        isActive,
        latitude,
        longitude,
        isSchoolAffiliated,
        instructorId, // Set the instructor who created this agency
    };
    const result = await (0, agency_1.createAgencyData)(agencyData);
    // createAgencyData returns an object { agency }, normalize to entity
    const createdAgency = result.agency ?? result;
    // Log audit event
    await (0, audit_1.logAuditEvent)(req, {
        action: "Agency Created",
        resource: "Agency Management",
        resourceId: createdAgency.id,
        details: `Created agency: ${createdAgency.name}`,
        category: "user_management",
        severity: "medium",
        metadata: {
            agencyName: createdAgency.name,
            agencyId: createdAgency.id,
        },
    });
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: "Agency created successfully",
        data: createdAgency,
    });
};
exports.createAgencyController = createAgencyController;
const getAgenciesController = async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "all", branchType = "all" } = req.query;
    // Get the instructor ID from the authenticated user
    const instructorId = req.user?.id;
    // Agencies are now shared - all instructors can see all agencies
    // But supervisors are filtered by instructor
    const result = await (0, agency_1.getAgenciesData)({
        page: Number(page),
        limit: Number(limit),
        search: search,
        status: status,
        branchType: branchType,
        instructorId,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Agencies retrieved successfully",
        data: result,
    });
};
exports.getAgenciesController = getAgenciesController;
const getAgencyController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Agency ID is required");
    }
    // Get the instructor ID from the authenticated user
    const instructorId = req.user?.id;
    const agency = await (0, agency_1.findAgencyByID)(id, instructorId);
    if (!agency) {
        throw new error_1.NotFoundError("Agency not found");
    }
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Agency retrieved successfully",
        data: agency,
    });
};
exports.getAgencyController = getAgencyController;
const updateAgencyController = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    if (!id) {
        throw new error_1.BadRequestError("Agency ID is required");
    }
    // Get the instructor ID from the authenticated user
    const instructorId = req.user?.id;
    const agency = await (0, agency_1.findAgencyByID)(id, instructorId);
    if (!agency) {
        throw new error_1.NotFoundError("Agency not found");
    }
    const result = await (0, agency_1.updateAgencyData)(id, updateData);
    // Log audit event
    await (0, audit_1.logAuditEvent)(req, {
        action: "Agency Updated",
        resource: "Agency Management",
        resourceId: id,
        details: `Updated agency: ${result.name}`,
        category: "user_management",
        severity: "medium",
        metadata: {
            agencyName: result.name,
            agencyId: id,
            updatedFields: Object.keys(updateData),
        },
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Agency updated successfully",
        data: result,
    });
};
exports.updateAgencyController = updateAgencyController;
const deleteAgencyController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Agency ID is required");
    }
    // Get the instructor ID from the authenticated user
    const instructorId = req.user?.id;
    const agency = await (0, agency_1.findAgencyByID)(id, instructorId);
    if (!agency) {
        throw new error_1.NotFoundError("Agency not found");
    }
    await (0, agency_1.deleteAgencyData)(id);
    // Log audit event
    await (0, audit_1.logAuditEvent)(req, {
        action: "Agency Deleted",
        resource: "Agency Management",
        resourceId: id,
        details: `Deleted agency: ${agency.name}`,
        category: "user_management",
        severity: "high",
        metadata: {
            agencyName: agency.name,
            agencyId: id,
        },
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Agency deleted successfully",
    });
};
exports.deleteAgencyController = deleteAgencyController;
const getArchivedAgenciesController = async (req, res) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    const result = await (0, agency_1.getArchivedAgenciesData)({
        page: Number(page),
        limit: Number(limit),
        search: search,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        data: result,
    });
};
exports.getArchivedAgenciesController = getArchivedAgenciesController;
const restoreAgencyController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Agency ID is required.");
    }
    const agency = await (0, agency_1.restoreAgencyData)(id);
    // Log audit event
    await (0, audit_1.logAuditEvent)(req, {
        action: "Agency Restored",
        resource: "Agency Management",
        resourceId: id,
        details: `Restored agency: ${agency.name}`,
        category: "user_management",
        severity: "medium",
        metadata: {
            agencyName: agency.name,
            agencyId: id,
        },
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Agency restored successfully",
        data: agency,
    });
};
exports.restoreAgencyController = restoreAgencyController;
const hardDeleteAgencyController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new error_1.BadRequestError("Agency ID is required.");
        }
        // Get agency details before deletion for audit logging
        const agency = await (0, agency_1.findAgencyByID)(id);
        const agencyName = agency ? agency.name : "Unknown";
        await (0, agency_1.hardDeleteAgencyData)(id);
        // Log audit event
        await (0, audit_1.logAuditEvent)(req, {
            action: "Agency Hard Deleted",
            resource: "Agency Management",
            resourceId: id,
            details: `Permanently deleted agency: ${agencyName}`,
            category: "user_management",
            severity: "high",
            metadata: {
                agencyName: agencyName,
                agencyId: id,
            },
        });
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Agency permanently deleted successfully",
        });
    }
    catch (error) {
        res.status(error.statusCode || http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || "Failed to permanently delete agency",
        });
    }
};
exports.hardDeleteAgencyController = hardDeleteAgencyController;
// Supervisor Management Controllers
const createSupervisorController = async (req, res) => {
    const { agencyId, name, email, phone, position, department, isActive = true, } = req.body;
    if (!agencyId || !name || !email || !phone || !position) {
        throw new error_1.BadRequestError("Please provide all necessary supervisor data.");
    }
    // Get the instructor ID from the authenticated user
    const instructorId = req.user?.id;
    const supervisorData = {
        agencyId,
        name,
        email,
        phone,
        position,
        department,
        isActive,
        createdByInstructorId: instructorId, // Track who created this supervisor
    };
    const result = await (0, agency_1.createSupervisorData)(supervisorData);
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: "Supervisor created successfully",
        data: result,
    });
};
exports.createSupervisorController = createSupervisorController;
const getSupervisorsController = async (req, res) => {
    const { agencyId } = req.params;
    const { page = 1, limit = 10, search = "", status = "all" } = req.query;
    if (!agencyId) {
        throw new error_1.BadRequestError("Agency ID is required");
    }
    // Get the instructor ID from the authenticated user
    const instructorId = req.user?.id;
    const result = await (0, agency_1.getSupervisorsData)({
        agencyId,
        page: Number(page),
        limit: Number(limit),
        search: search,
        status: status,
        instructorId,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Supervisors retrieved successfully",
        data: result,
    });
};
exports.getSupervisorsController = getSupervisorsController;
const getSupervisorController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Supervisor ID is required");
    }
    const supervisor = await (0, agency_1.findSupervisorByID)(id);
    if (!supervisor) {
        throw new error_1.NotFoundError("Supervisor not found");
    }
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Supervisor retrieved successfully",
        data: supervisor,
    });
};
exports.getSupervisorController = getSupervisorController;
const updateSupervisorController = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    if (!id) {
        throw new error_1.BadRequestError("Supervisor ID is required");
    }
    const supervisor = await (0, agency_1.findSupervisorByID)(id);
    if (!supervisor) {
        throw new error_1.NotFoundError("Supervisor not found");
    }
    // Get the instructor ID from the authenticated user for ownership check
    const instructorId = req.user?.id;
    const result = await (0, agency_1.updateSupervisorData)(id, updateData, instructorId);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Supervisor updated successfully",
        data: result,
    });
};
exports.updateSupervisorController = updateSupervisorController;
const deleteSupervisorController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Supervisor ID is required");
    }
    const supervisor = await (0, agency_1.findSupervisorByID)(id);
    if (!supervisor) {
        throw new error_1.NotFoundError("Supervisor not found");
    }
    // Get the instructor ID from the authenticated user for ownership check
    const instructorId = req.user?.id;
    await (0, agency_1.deleteSupervisorData)(id, instructorId);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Supervisor deleted successfully",
    });
};
exports.deleteSupervisorController = deleteSupervisorController;
const getAgencySupervisorStatsController = async (req, res) => {
    const { agencyId } = req.params;
    if (!agencyId) {
        throw new error_1.BadRequestError("Agency ID is required");
    }
    // Get the instructor ID from the authenticated user
    const instructorId = req.user?.id;
    const stats = await (0, agency_1.getAgencySupervisorStats)(agencyId, instructorId);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Supervisor statistics retrieved successfully",
        data: stats,
    });
};
exports.getAgencySupervisorStatsController = getAgencySupervisorStatsController;
