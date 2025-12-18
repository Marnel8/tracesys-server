"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDeleteSectionController = exports.restoreSectionController = exports.getArchivedSectionsController = exports.deleteSectionController = exports.updateSectionController = exports.getSectionController = exports.getSectionsController = exports.createSectionController = void 0;
const http_status_codes_1 = require("http-status-codes");
const error_1 = require("../../utils/error.js");
const section_1 = require("../../data/section.js");
const createSectionController = async (req, res) => {
    const { name, code, description, courseId, year, semester, academicYear, maxStudents = 50, isActive = true, } = req.body;
    if (!name || !courseId || !year || !semester || !academicYear) {
        throw new error_1.BadRequestError("Please provide section name, course, year, semester, and academic year.");
    }
    // Get the instructor ID from the authenticated user
    const instructorId = req.user?.id;
    if (!instructorId) {
        throw new error_1.BadRequestError("Instructor ID not found. Please ensure you are logged in.");
    }
    const sectionData = {
        name,
        code,
        description,
        courseId,
        instructorId,
        year,
        semester,
        academicYear,
        maxStudents,
        isActive,
    };
    const result = await (0, section_1.createSectionData)(sectionData);
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: "Section created successfully",
        data: result,
    });
};
exports.createSectionController = createSectionController;
const getSectionsController = async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "all", courseId, year, semester } = req.query;
    const result = await (0, section_1.getSectionsData)({
        page: Number(page),
        limit: Number(limit),
        search: search,
        status: status,
        courseId: courseId,
        year: year,
        semester: semester,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Sections retrieved successfully",
        data: result,
    });
};
exports.getSectionsController = getSectionsController;
const getSectionController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Section ID is required");
    }
    const section = await (0, section_1.findSectionByID)(id);
    if (!section) {
        throw new error_1.NotFoundError("Section not found");
    }
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Section retrieved successfully",
        data: section,
    });
};
exports.getSectionController = getSectionController;
const updateSectionController = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    if (!id) {
        throw new error_1.BadRequestError("Section ID is required");
    }
    const section = await (0, section_1.findSectionByID)(id);
    if (!section) {
        throw new error_1.NotFoundError("Section not found");
    }
    const result = await (0, section_1.updateSectionData)(id, updateData);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Section updated successfully",
        data: result,
    });
};
exports.updateSectionController = updateSectionController;
const deleteSectionController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Section ID is required");
    }
    const section = await (0, section_1.findSectionByID)(id);
    if (!section) {
        throw new error_1.NotFoundError("Section not found");
    }
    await (0, section_1.deleteSectionData)(id);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Section deleted successfully",
    });
};
exports.deleteSectionController = deleteSectionController;
const getArchivedSectionsController = async (req, res) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    const result = await (0, section_1.getArchivedSectionsData)({
        page: Number(page),
        limit: Number(limit),
        search: search,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        data: result,
    });
};
exports.getArchivedSectionsController = getArchivedSectionsController;
const restoreSectionController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Section ID is required.");
    }
    const section = await (0, section_1.restoreSectionData)(id);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Section restored successfully",
        data: section,
    });
};
exports.restoreSectionController = restoreSectionController;
const hardDeleteSectionController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new error_1.BadRequestError("Section ID is required.");
        }
        await (0, section_1.hardDeleteSectionData)(id);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Section permanently deleted successfully",
        });
    }
    catch (error) {
        res.status(error.statusCode || http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || "Failed to permanently delete section",
        });
    }
};
exports.hardDeleteSectionController = hardDeleteSectionController;
