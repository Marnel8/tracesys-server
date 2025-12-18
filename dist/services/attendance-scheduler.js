"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAbsentRecordsForDate = void 0;
const sequelize_1 = require("sequelize");
const attendance_record_1 = __importDefault(require("../db/models/attendance-record.js"));
const practicum_1 = __importDefault(require("../db/models/practicum.js"));
const agency_1 = __importDefault(require("../db/models/agency.js"));
const attendance_1 = require("../data/attendance.js");
const colors_1 = __importDefault(require("colors"));
/**
 * Creates absent attendance records for students who didn't clock in on a given date
 * @param targetDate - The date to check (defaults to yesterday)
 */
const createAbsentRecordsForDate = async (targetDate) => {
    const now = new Date();
    const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Default to yesterday if no date provided
    let checkDate;
    if (targetDate) {
        checkDate = new Date(targetDate);
    }
    else {
        // Get yesterday's date in local timezone
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const localDateStr = yesterday.toLocaleDateString("en-CA", { timeZone: serverTimeZone }); // YYYY-MM-DD
        const [year, month, day] = localDateStr.split("-").map(Number);
        checkDate = new Date(year, month - 1, day);
    }
    // Get day name for the date
    const dayName = checkDate.toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: serverTimeZone,
    });
    const dateStr = checkDate.toISOString().split("T")[0]; // YYYY-MM-DD format
    console.log(colors_1.default.cyan(`[Attendance Scheduler] Checking for absent records on ${dayName}, ${dateStr}`));
    try {
        // Get all active practicums with their agencies
        const activePracticums = await practicum_1.default.findAll({
            where: {
                status: "active",
                startDate: { [sequelize_1.Op.lte]: checkDate },
                endDate: { [sequelize_1.Op.gte]: checkDate },
            },
            include: [
                {
                    model: agency_1.default,
                    as: "agency",
                    attributes: ["id", "name", "operatingDays"],
                },
            ],
        });
        console.log(colors_1.default.cyan(`[Attendance Scheduler] Found ${activePracticums.length} active practicums`));
        let createdCount = 0;
        let skippedCount = 0;
        for (const practicum of activePracticums) {
            const agency = practicum.agency;
            // Check if this date is an operating day for the agency
            if (!(0, attendance_1.checkOperatingDay)(agency, checkDate)) {
                console.log(colors_1.default.yellow(`[Attendance Scheduler] Skipping ${agency?.name || "Unknown"} - ${dayName} is not an operating day`));
                skippedCount++;
                continue;
            }
            // Check if attendance record already exists for this date
            const existingRecord = await attendance_record_1.default.findOne({
                where: {
                    studentId: practicum.studentId,
                    practicumId: practicum.id,
                    date: checkDate,
                },
            });
            if (existingRecord) {
                // Record already exists, skip
                skippedCount++;
                continue;
            }
            // Create absent record
            try {
                await attendance_record_1.default.create({
                    studentId: practicum.studentId,
                    practicumId: practicum.id,
                    date: checkDate,
                    day: dayName,
                    status: "absent",
                    approvalStatus: "Pending",
                    hours: 0,
                });
                createdCount++;
                console.log(colors_1.default.green(`[Attendance Scheduler] Created absent record for practicum ${practicum.id} on ${dateStr}`));
            }
            catch (error) {
                console.error(colors_1.default.red(`[Attendance Scheduler] Error creating absent record for practicum ${practicum.id}: ${error.message}`));
            }
        }
        console.log(colors_1.default.green(`[Attendance Scheduler] Completed: ${createdCount} absent records created, ${skippedCount} skipped`));
        return {
            date: dateStr,
            created: createdCount,
            skipped: skippedCount,
            total: activePracticums.length,
        };
    }
    catch (error) {
        console.error(colors_1.default.red(`[Attendance Scheduler] Error: ${error.message}`));
        throw error;
    }
};
exports.createAbsentRecordsForDate = createAbsentRecordsForDate;
