import { Op } from "sequelize";
import AttendanceRecord from "@/db/models/attendance-record";
import Practicum from "@/db/models/practicum";
import Agency from "@/db/models/agency";
import { checkOperatingDay } from "@/data/attendance";
import colors from "colors";

/**
 * Creates absent attendance records for students who didn't clock in on a given date
 * @param targetDate - The date to check (defaults to yesterday)
 */
export const createAbsentRecordsForDate = async (targetDate?: Date) => {
	const now = new Date();
	const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	
	// Default to yesterday if no date provided
	let checkDate: Date;
	if (targetDate) {
		checkDate = new Date(targetDate);
	} else {
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
	
	console.log(
		colors.cyan(`[Attendance Scheduler] Checking for absent records on ${dayName}, ${dateStr}`)
	);
	
	try {
		// Get all active practicums with their agencies
		const activePracticums = await Practicum.findAll({
			where: {
				status: "active",
				startDate: { [Op.lte]: checkDate },
				endDate: { [Op.gte]: checkDate },
			},
			include: [
				{
					model: Agency,
					as: "agency" as any,
					attributes: ["id", "name", "operatingDays"],
				},
			],
		});
		
		console.log(
			colors.cyan(
				`[Attendance Scheduler] Found ${activePracticums.length} active practicums`
			)
		);
		
		let createdCount = 0;
		let skippedCount = 0;
		
		for (const practicum of activePracticums) {
			const agency = (practicum as any).agency as Agency | null;
			
			// Check if this date is an operating day for the agency
			if (!checkOperatingDay(agency, checkDate)) {
				console.log(
					colors.yellow(
						`[Attendance Scheduler] Skipping ${agency?.name || "Unknown"} - ${dayName} is not an operating day`
					)
				);
				skippedCount++;
				continue;
			}
			
			// Check if attendance record already exists for this date
			const existingRecord = await AttendanceRecord.findOne({
				where: {
					studentId: practicum.studentId,
					practicumId: practicum.id,
					date: checkDate as any,
				},
			});
			
			if (existingRecord) {
				// Record already exists, skip
				skippedCount++;
				continue;
			}
			
			// Create absent record
			try {
				await AttendanceRecord.create({
					studentId: practicum.studentId,
					practicumId: practicum.id,
					date: checkDate as any,
					day: dayName,
					status: "absent",
					approvalStatus: "Pending",
					hours: 0,
				} as any);
				
				createdCount++;
				console.log(
					colors.green(
						`[Attendance Scheduler] Created absent record for practicum ${practicum.id} on ${dateStr}`
					)
				);
			} catch (error: any) {
				console.error(
					colors.red(
						`[Attendance Scheduler] Error creating absent record for practicum ${practicum.id}: ${error.message}`
					)
				);
			}
		}
		
		console.log(
			colors.green(
				`[Attendance Scheduler] Completed: ${createdCount} absent records created, ${skippedCount} skipped`
			)
		);
		
		return {
			date: dateStr,
			created: createdCount,
			skipped: skippedCount,
			total: activePracticums.length,
		};
	} catch (error: any) {
		console.error(
			colors.red(`[Attendance Scheduler] Error: ${error.message}`)
		);
		throw error;
	}
};

