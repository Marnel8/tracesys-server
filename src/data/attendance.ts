import { Op } from "sequelize";
import AttendanceRecord from "@/db/models/attendance-record";
import DetailedAttendanceLog from "@/db/models/detailed-attendance-log";
import User from "@/db/models/user";
import Practicum from "@/db/models/practicum";
import Agency from "@/db/models/agency";
import StudentEnrollment from "@/db/models/student-enrollment";
import Section from "@/db/models/section";

export type AttendanceApprovalStatus = "Pending" | "Approved" | "Declined";

interface Pagination {
	page: number;
	limit: number;
}

interface ListAttendanceParams extends Pagination {
	search?: string;
	status?: "present" | "absent" | "excused" | "all";
	approvalStatus?: AttendanceApprovalStatus | "all";
	studentId?: string;
	practicumId?: string;
	date?: string; // YYYY-MM-DD
	startDate?: string; // YYYY-MM-DD
	endDate?: string; // YYYY-MM-DD
	instructorId?: string;
}

export const getAttendanceListData = async (params: ListAttendanceParams) => {
	const { page, limit, search, status, approvalStatus, studentId, practicumId, date, startDate, endDate, instructorId } = params;
	const offset = (page - 1) * limit;

	const where: any = {};
	if (search?.trim()) {
		where[Op.or] = [
			{ day: { [Op.like]: `%${search}%` } },
			{ '$student.firstName$': { [Op.like]: `%${search}%` } },
			{ '$student.lastName$': { [Op.like]: `%${search}%` } },
			{ '$student.studentId$': { [Op.like]: `%${search}%` } },
		];
	}
	if (status && status !== "all") {
		where.status = status;
	}
	if (approvalStatus && approvalStatus !== "all") {
		where.approvalStatus = approvalStatus;
	}
	if (studentId) {
		where.studentId = studentId;
	}
	if (practicumId) {
		where.practicumId = practicumId;
	}
	if (date) {
		where.date = date as any;
	} else if (startDate || endDate) {
		const dateFilter: any = {};
		if (startDate) {
			dateFilter[Op.gte] = startDate;
		}
		if (endDate) {
			dateFilter[Op.lte] = endDate;
		}
		where.date = dateFilter;
	}

	// instructor scoping handled via include-level where below

	const { count, rows } = await AttendanceRecord.findAndCountAll({
		where,
		limit,
		offset,
		order: [["createdAt", "DESC"]],
		subQuery: false,
		distinct: true,
		include: [
			{ 
				model: User, 
				as: "student" as any, 
				attributes: ["id", "firstName", "lastName", "email", "studentId"],
				required: true,
				include: [
					{
						model: StudentEnrollment,
						as: "enrollments" as any,
					attributes: [],
						required: !!instructorId,
						include: [
							{
								model: Section,
								as: "section" as any,
								attributes: [],
								required: !!instructorId,
								where: instructorId ? { instructorId } : undefined,
							},
						],
					},
				],
			},
			{ 
				model: Practicum, 
				as: "practicum" as any,
				include: [
					{ 
						model: Agency, 
						as: "agency" as any,
						attributes: ["id", "name", "address", "branchType", "openingTime", "closingTime", "operatingDays", "lunchStartTime", "lunchEndTime", "contactPerson", "contactRole", "contactPhone", "contactEmail"]
					}
				]
			},
		],
	});

	return {
		attendance: rows,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(count / limit),
			totalItems: count,
			itemsPerPage: limit,
		},
	};
};

export const findAttendanceByIdData = async (id: string) => {
	const record = await AttendanceRecord.findByPk(id, {
		include: [
			{ model: User, as: "student" as any, attributes: ["id", "firstName", "lastName", "email", "studentId"] },
			{ 
				model: Practicum, 
				as: "practicum" as any,
				include: [
					{ 
						model: Agency, 
						as: "agency" as any,
						attributes: ["id", "name", "address", "branchType", "openingTime", "closingTime", "operatingDays", "lunchStartTime", "lunchEndTime", "contactPerson", "contactRole", "contactPhone", "contactEmail"]
					}
				]
			},
			{
				model: DetailedAttendanceLog,
				as: "detailedLogs" as any,
				attributes: ["id", "sessionType", "photoIn", "photoOut"],
				required: false,
			},
		],
	});
	return record;
};

// Helper function to check if a date is an operating day
export const checkOperatingDay = (agency: Agency | null, date: Date): boolean => {
	if (!agency?.operatingDays) return true; // If no operating days set, allow all days
	
	// Ensure we have a valid date object
	if (!(date instanceof Date) || isNaN(date.getTime())) {
		return true; // If invalid date, allow (fail open)
	}
	
	// Use "en-US" locale with server's local timezone to match client-side formatting
	// This ensures we get the correct day name in the server's timezone (Philippines = UTC+8)
	const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const dayName = date.toLocaleDateString("en-US", { 
		weekday: "long",
		timeZone: serverTimeZone 
	});
	
	// Parse and normalize operating days (case-insensitive comparison)
	const operatingDaysRaw = String(agency.operatingDays).trim();
	
	// Split by comma and clean up each day name
	const operatingDays = operatingDaysRaw
		.split(",")
		.map(d => d.trim())
		.filter(d => d.length > 0)
		.map(d => d.toLowerCase());
	
	const normalizedDayName = dayName.toLowerCase().trim();
	
	// Debug: Log the comparison (remove in production if needed)
	console.log('[checkOperatingDay]', {
		date: date.toISOString(),
		localDate: date.toLocaleDateString("en-US", { timeZone: serverTimeZone }),
		dayName,
		normalizedDayName,
		operatingDaysRaw,
		operatingDays,
		serverTimeZone,
		isMatch: operatingDays.includes(normalizedDayName)
	});
	
	// Check if the normalized day name is in the operating days list
	return operatingDays.includes(normalizedDayName);
};

// Helper function to check if time is within operating hours for a session
// Note: Time-based restrictions are handled by the frontend, which marks late/early clock-ins in remarks.
// This function now allows all clock-ins regardless of time, as early and late clock-ins are permitted.
export const checkOperatingHours = (
	agency: Agency | null,
	currentTime: Date,
	sessionType: "morning" | "afternoon" | "overtime"
): { valid: boolean; message?: string } => {
	// Allow all clock-ins regardless of time
	// The frontend handles time-based logic and marks late/early clock-ins in the remarks field
	// Operating day validation is handled separately by checkOperatingDay
	return { valid: true };
};

/**
 * Calculate the actual lunch break duration based on clock times.
 * Lunch duration is the time between morning clock-out and afternoon clock-in.
 * 
 * @param morningTimeOut - Morning session clock-out time
 * @param afternoonTimeIn - Afternoon session clock-in time
 * @returns Lunch duration in hours, or null if either time is missing
 */
export const calculateLunchDuration = (
	morningTimeOut: Date | null,
	afternoonTimeIn: Date | null
): number | null => {
	if (!morningTimeOut || !afternoonTimeIn) {
		return null;
	}

	const lunchMs = new Date(afternoonTimeIn).getTime() - new Date(morningTimeOut).getTime();
	const lunchHours = lunchMs / (1000 * 60 * 60);
	return Math.max(0, Math.round(lunchHours * 100) / 100);
};

/**
 * Calculate total work hours excluding lunch break.
 * 
 * Lunch is automatically excluded by calculating morning and afternoon sessions separately.
 * The gap between morningTimeOut and afternoonTimeIn is the lunch break and is not included.
 * 
 * @param morningTimeIn - Morning session clock-in time
 * @param morningTimeOut - Morning session clock-out time
 * @param afternoonTimeIn - Afternoon session clock-in time
 * @param afternoonTimeOut - Afternoon session clock-out time
 * @returns Total work hours (morning + afternoon), excluding lunch break
 */
export const calculateHoursWithLunchExclusion = (
	morningTimeIn: Date | null,
	morningTimeOut: Date | null,
	afternoonTimeIn: Date | null,
	afternoonTimeOut: Date | null
): number => {
	let totalHours = 0;

	// Calculate morning hours
	if (morningTimeIn && morningTimeOut) {
		const morningMs = new Date(morningTimeOut).getTime() - new Date(morningTimeIn).getTime();
		totalHours += Math.max(0, morningMs / (1000 * 60 * 60));
	}

	// Calculate afternoon hours
	if (afternoonTimeIn && afternoonTimeOut) {
		const afternoonMs = new Date(afternoonTimeOut).getTime() - new Date(afternoonTimeIn).getTime();
		totalHours += Math.max(0, afternoonMs / (1000 * 60 * 60));
	}

	// Lunch time is automatically excluded since we calculate morning and afternoon separately
	// The gap between morningTimeOut and afternoonTimeIn is the lunch break
	return Math.round(totalHours * 100) / 100;
};

// Helper function to nullify incomplete sessions at end of day
export const nullifyIncompleteSessions = async (studentId: string, practicumId: string, date: Date) => {
	const record = await AttendanceRecord.findOne({
		where: {
			studentId,
			practicumId,
			date: date as any,
		},
	});

	if (!record) return;

	const updates: any = {};

	// Nullify morning session if clocked in but not out
	if (record.morningTimeIn && !record.morningTimeOut) {
		updates.morningTimeIn = null;
	}

	// Nullify afternoon session if clocked in but not out
	if (record.afternoonTimeIn && !record.afternoonTimeOut) {
		updates.afternoonTimeIn = null;
	}

	// Nullify overtime session if clocked in but not out
	if (record.overtimeTimeIn && !record.overtimeTimeOut) {
		updates.overtimeTimeIn = null;
	}

	if (Object.keys(updates).length > 0) {
		await record.update(updates);
	}
};

interface ClockInParams {
	studentId: string;
	practicumId: string;
	date?: string; // YYYY-MM-DD
	day?: string;
	latitude?: number | null;
	longitude?: number | null;
	address?: string | null;
	locationType?: "Inside" | "In-field" | "Outside";
	deviceType?: "Mobile" | "Desktop" | "Tablet";
	deviceUnit?: string | null;
	macAddress?: string | null;
	remarks?: "Normal" | "Early";
	photoUrl?: string | null;
	sessionType?: "morning" | "afternoon" | "overtime";
	agency?: Agency | null;
}

export const clockInData = async (params: ClockInParams) => {
	const now = new Date();
	// Get server's local timezone
	const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	
	// Create date in local timezone to avoid UTC issues
	// Always use the current local date/time, not UTC
	let recordDate: Date;
	if (params.date) {
		// Parse date string and create in local timezone
		// Format: YYYY-MM-DD - interpret as local date, not UTC
		const [year, month, day] = params.date.split("-").map(Number);
		recordDate = new Date(year, month - 1, day);
	} else {
		// Use current local date (not UTC)
		// Get the local date components to ensure we're using the correct day
		const localDateStr = now.toLocaleDateString("en-CA", { timeZone: serverTimeZone }); // YYYY-MM-DD format
		const [year, month, day] = localDateStr.split("-").map(Number);
		recordDate = new Date(year, month - 1, day);
	}
	
	// Use "en-US" locale with server's timezone to get the correct day name
	const day = params.day ?? recordDate.toLocaleDateString("en-US", { 
		weekday: "long", 
		timeZone: serverTimeZone 
	});
	const sessionType = params.sessionType || "morning"; // Default to morning for backward compatibility

	// NOTE: Agency lunch times (lunchStartTime, lunchEndTime) are REFERENCE POINTS ONLY
	// They are used for session determination and remarks calculation in the frontend,
	// NOT for hours calculation. Actual lunch duration is calculated dynamically as:
	// afternoonTimeIn - morningTimeOut

	// Validate operating day
	if (params.agency) {
		if (!checkOperatingDay(params.agency, recordDate)) {
			// Format operating days for error message
			const operatingDaysList = params.agency.operatingDays 
				? String(params.agency.operatingDays).split(",").map(d => d.trim()).join(",")
				: "Not set";
			throw new Error(`Today (${day}) is not an operating day. Operating days: ${operatingDaysList}`);
		}

		// Validate operating hours
		const hoursCheck = checkOperatingHours(params.agency, now, sessionType);
		if (!hoursCheck.valid) {
			throw new Error(hoursCheck.message || "Clock-in time is outside operating hours");
		}
	}

	let record = await AttendanceRecord.findOne({
		where: {
			studentId: params.studentId,
			practicumId: params.practicumId,
			date: recordDate as any,
		},
	});

	const updateData: any = {
		latitude: params.latitude ?? null,
		longitude: params.longitude ?? null,
		address: params.address ?? null,
		timeInLocationType: params.locationType ?? null as any,
		timeInDeviceType: params.deviceType ?? null as any,
		timeInDeviceUnit: params.deviceUnit ?? null,
		timeInMacAddress: params.macAddress ?? null,
		timeInRemarks: params.remarks ?? "Normal",
		approvalStatus: "Approved",
		photoIn: params.photoUrl ?? null,
		sessionType: sessionType === "morning" || sessionType === "afternoon" || sessionType === "overtime" ? sessionType : "full_day",
	};

	if (sessionType === "morning") {
		// Check if already clocked in for morning
		if (record?.morningTimeIn && !record.morningTimeOut) {
			throw new Error("You are already clocked in for the morning session. Please clock out first.");
		}
		updateData.morningTimeIn = now;
		updateData.timeIn = now; // Keep for backward compatibility
	} else if (sessionType === "afternoon") {
		// Check if already clocked in for afternoon
		if (record?.afternoonTimeIn && !record.afternoonTimeOut) {
			throw new Error("You are already clocked in for the afternoon session. Please clock out first.");
		}
		// Ensure morning session is completed or nullified
		if (record?.morningTimeIn && !record.morningTimeOut) {
			// Nullify incomplete morning session
			updateData.morningTimeIn = null;
		}
		updateData.afternoonTimeIn = now;
		updateData.timeIn = now; // Keep for backward compatibility
	} else if (sessionType === "overtime") {
		// Check if already clocked in for overtime
		if (record?.overtimeTimeIn && !record.overtimeTimeOut) {
			throw new Error("You are already clocked in for the overtime session. Please clock out first.");
		}
		// Ensure both morning and afternoon sessions are complete before allowing overtime
		const morningComplete = record?.morningTimeIn && record?.morningTimeOut;
		const afternoonComplete = record?.afternoonTimeIn && record?.afternoonTimeOut;
		if (!morningComplete || !afternoonComplete) {
			throw new Error("You must complete both morning and afternoon sessions before clocking in for overtime.");
		}
		updateData.overtimeTimeIn = now;
		updateData.timeIn = now; // Keep for backward compatibility
	}

	if (!record) {
		updateData.studentId = params.studentId;
		updateData.practicumId = params.practicumId;
		updateData.date = recordDate as any;
		updateData.day = day;
		updateData.status = "present";
		
		record = await AttendanceRecord.create(updateData as any);
	} else {
		// Keep existing status if record exists, default to "present" if not set
		updateData.status = record.status ?? "present";
		await record.update(updateData);
	}

	// Create detailed log entry
	await DetailedAttendanceLog.create({
		attendanceRecordId: record.id,
		sessionType: sessionType,
		photoIn: params.photoUrl ?? null,
		timeInLocationType: params.locationType ?? "Inside",
		timeInDeviceType: params.deviceType ?? "Desktop",
		timeInDeviceUnit: params.deviceUnit ?? null,
		timeInMacAddress: params.macAddress ?? null,
		timeInRemarks: params.remarks ?? "Normal",
		timeInExactLocation: params.address ?? null,
		status: "Approved",
	} as any);

	return record;
};

interface ClockOutParams {
	studentId: string;
	practicumId: string;
	date?: string; // YYYY-MM-DD
	latitude?: number | null;
	longitude?: number | null;
	address?: string | null;
	locationType?: "Inside" | "In-field" | "Outside";
	deviceType?: "Mobile" | "Desktop" | "Tablet";
	deviceUnit?: string | null;
	macAddress?: string | null;
	remarks?: "Normal" | "Early Departure" | "Overtime";
	photoUrl?: string | null;
	sessionType?: "morning" | "afternoon" | "overtime";
	agency?: Agency | null;
}

export const clockOutData = async (params: ClockOutParams) => {
	const now = new Date();
	const recordDate = params.date ? new Date(params.date) : new Date(now.toISOString().slice(0, 10));
	const sessionType = params.sessionType || "morning"; // Default to morning for backward compatibility

	const record = await AttendanceRecord.findOne({
		where: {
			studentId: params.studentId,
			practicumId: params.practicumId,
			date: recordDate as any,
		},
	});

	if (!record) {
		throw new Error("No attendance record found for today to clock out");
	}

	// Validate operating hours
	if (params.agency) {
		const hoursCheck = checkOperatingHours(params.agency, now, sessionType);
		if (!hoursCheck.valid) {
			throw new Error(hoursCheck.message || "Clock-out time is outside operating hours");
		}
	}

	const updateData: any = {
		timeOutLocationType: params.locationType ?? record.timeOutLocationType ?? null,
		timeOutDeviceType: params.deviceType ?? record.timeOutDeviceType ?? null,
		timeOutDeviceUnit: params.deviceUnit ?? record.timeOutDeviceUnit ?? null,
		timeOutMacAddress: params.macAddress ?? record.timeOutMacAddress ?? null,
		timeOutRemarks: params.remarks ?? record.timeOutRemarks ?? "Normal",
		approvalStatus: "Approved",
		photoOut: params.photoUrl ?? record.photoOut ?? null,
		latitude: params.latitude ?? record.latitude ?? null,
		longitude: params.longitude ?? record.longitude ?? null,
		address: params.address ?? record.address ?? null,
	};

	if (sessionType === "morning") {
		// Check if clocked in for morning
		if (!record.morningTimeIn) {
			throw new Error("You must clock in for the morning session before clocking out");
		}
		if (record.morningTimeOut) {
			throw new Error("You have already clocked out for the morning session");
		}
		updateData.morningTimeOut = now;
		updateData.timeOut = now; // Keep for backward compatibility
	} else if (sessionType === "afternoon") {
		// Check if clocked in for afternoon
		if (!record.afternoonTimeIn) {
			throw new Error("You must clock in for the afternoon session before clocking out");
		}
		if (record.afternoonTimeOut) {
			throw new Error("You have already clocked out for the afternoon session");
		}
		updateData.afternoonTimeOut = now;
		updateData.timeOut = now; // Keep for backward compatibility
	} else if (sessionType === "overtime") {
		// Check if clocked in for overtime
		if (!record.overtimeTimeIn) {
			throw new Error("You must clock in for the overtime session before clocking out");
		}
		if (record.overtimeTimeOut) {
			throw new Error("You have already clocked out for the overtime session");
		}
		updateData.overtimeTimeOut = now;
		updateData.timeOut = now; // Keep for backward compatibility
	}

	// Calculate total hours excluding lunch
	// Lunch is automatically excluded by calculating morning and afternoon sessions separately
	const totalHours = calculateHoursWithLunchExclusion(
		record.morningTimeIn || updateData.morningTimeIn || null,
		updateData.morningTimeOut || record.morningTimeOut || null,
		record.afternoonTimeIn || updateData.afternoonTimeIn || null,
		updateData.afternoonTimeOut || record.afternoonTimeOut || null
	);

	// Add overtime hours if present
	let overtimeHours = 0;
	const overtimeTimeIn = record.overtimeTimeIn || updateData.overtimeTimeIn || null;
	const overtimeTimeOut = record.overtimeTimeOut || updateData.overtimeTimeOut || null;
	if (overtimeTimeIn && overtimeTimeOut) {
		const overtimeMs = new Date(overtimeTimeOut).getTime() - new Date(overtimeTimeIn).getTime();
		overtimeHours = Math.max(0, overtimeMs / (1000 * 60 * 60));
	}

	updateData.hours = Math.round((totalHours + overtimeHours) * 100) / 100;

	await record.update(updateData);

	// Update detailed log entry
	const detailedLog = await DetailedAttendanceLog.findOne({
		where: {
			attendanceRecordId: record.id,
			sessionType: sessionType,
		},
		order: [["createdAt", "DESC"]],
	});

	if (detailedLog) {
		await detailedLog.update({
			photoOut: params.photoUrl ?? null,
			timeOutLocationType: params.locationType ?? null,
			timeOutDeviceType: params.deviceType ?? null,
			timeOutDeviceUnit: params.deviceUnit ?? null,
			timeOutMacAddress: params.macAddress ?? null,
			timeOutRemarks: params.remarks ?? "Normal",
			timeOutExactLocation: params.address ?? null,
		} as any);
	}

	return record;
};

// approval workflow removed per product decision


