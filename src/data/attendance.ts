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
  const {
    page,
    limit,
    search,
    status,
    approvalStatus,
    studentId,
    practicumId,
    date,
    startDate,
    endDate,
    instructorId,
  } = params;
  const offset = (page - 1) * limit;

  const where: any = {};
  if (search?.trim()) {
    where[Op.or] = [
      { day: { [Op.like]: `%${search}%` } },
      { "$student.firstName$": { [Op.like]: `%${search}%` } },
      { "$student.lastName$": { [Op.like]: `%${search}%` } },
      { "$student.studentId$": { [Op.like]: `%${search}%` } },
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
        attributes: [
          "id",
          "firstName",
          "lastName",
          "email",
          "studentId",
          "gender",
        ],
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
            attributes: [
              "id",
              "name",
              "address",
              "branchType",
              "openingTime",
              "closingTime",
              "operatingDays",
              "lunchStartTime",
              "lunchEndTime",
              "contactPerson",
              "contactRole",
              "contactPhone",
              "contactEmail",
            ],
          },
        ],
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
      {
        model: User,
        as: "student" as any,
        attributes: [
          "id",
          "firstName",
          "lastName",
          "email",
          "studentId",
          "gender",
        ],
      },
      {
        model: Practicum,
        as: "practicum" as any,
        include: [
          {
            model: Agency,
            as: "agency" as any,
            attributes: [
              "id",
              "name",
              "address",
              "branchType",
              "openingTime",
              "closingTime",
              "operatingDays",
              "lunchStartTime",
              "lunchEndTime",
              "contactPerson",
              "contactRole",
              "contactPhone",
              "contactEmail",
            ],
          },
        ],
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
export const checkOperatingDay = (
  agency: Agency | null,
  date: Date
): boolean => {
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
    timeZone: serverTimeZone,
  });

  // Parse and normalize operating days (case-insensitive comparison)
  const operatingDaysRaw = String(agency.operatingDays).trim();

  // Split by comma and clean up each day name
  const operatingDays = operatingDaysRaw
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d.length > 0)
    .map((d) => d.toLowerCase());

  const normalizedDayName = dayName.toLowerCase().trim();

  // Debug: Log the comparison (remove in production if needed)
  console.log("[checkOperatingDay]", {
    date: date.toISOString(),
    localDate: date.toLocaleDateString("en-US", { timeZone: serverTimeZone }),
    dayName,
    normalizedDayName,
    operatingDaysRaw,
    operatingDays,
    serverTimeZone,
    isMatch: operatingDays.includes(normalizedDayName),
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
 * Helper function to parse time string to minutes since midnight
 * Handles formats: "HH:MM", "HH:MM:SS", "H:MM"
 * Normalizes and validates time format
 */
const parseTimeToMinutes = (
  timeStr: string | null | undefined
): number | null => {
  if (!timeStr) return null;
  // Normalize: trim whitespace and split by colon
  const normalized = String(timeStr).trim();
  const parts = normalized.split(":");
  if (parts.length < 2) return null;
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  // Validate: hours 0-23, minutes 0-59
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  
  return hours * 60 + minutes;
};

/**
 * Helper function to calculate time boundaries based on agency operating hours
 * Returns dynamic boundaries instead of hardcoded times
 */
const calculateTimeBoundaries = (agency: Agency | null) => {
  const opening = parseTimeToMinutes(agency?.openingTime);
  const closing = parseTimeToMinutes(agency?.closingTime);
  const lunchStart = parseTimeToMinutes(agency?.lunchStartTime);
  const lunchEnd = parseTimeToMinutes(agency?.lunchEndTime);

  // Morning clock-in cutoff: Use lunch start time if available, otherwise calculate from opening time
  // If lunch starts at 12:00 PM, morning clock-in closes at 11:59 AM (1 minute before lunch)
  // If no lunch time, use 2 hours after opening (e.g., 8:00 AM -> 10:00 AM cutoff)
  let morningCutoff: number;
  if (lunchStart !== null) {
    // Morning closes 1 minute before lunch starts (inclusive: <= lunchStart - 1)
    morningCutoff = lunchStart - 1;
  } else if (opening !== null) {
    // Default: 2 hours after opening (e.g., 8:00 AM -> 10:00 AM)
    morningCutoff = opening + (2 * 60);
  } else {
    // Fallback: 10:59 AM if no operating hours set
    morningCutoff = 10 * 60 + 59;
  }

  // Morning boundary: 1 minute after cutoff (exclusive boundary)
  const morningBoundary = morningCutoff + 1;

  // Lunch window: Use agency lunch times, or default 12:00 PM - 12:59 PM
  const lunchWindowStart = lunchStart ?? 12 * 60; // 12:00 PM default
  const lunchWindowEnd = lunchEnd ?? (12 * 60 + 59); // 12:59 PM default

  // Afternoon clock-out window: After closing time
  // Start: Closing time (e.g., 5:00 PM)
  // Deadline: Closing time + 1 hour (e.g., 6:00 PM), minimum 6:00 PM
  const afternoonClockOutStart = closing ?? 17 * 60; // 5:00 PM default
  const afternoonClockOutDeadline = closing !== null 
    ? Math.max(closing + 60, 18 * 60) // Closing + 1 hour, but at least 6:00 PM
    : 18 * 60; // 6:00 PM default

  return {
    morningCutoff,
    morningBoundary,
    lunchWindowStart,
    lunchWindowEnd,
    afternoonClockOutStart,
    afternoonClockOutDeadline,
  };
};

/**
 * Check if morning clock-in window is still open
 * Morning clock-in is available until lunch start time - 1 minute (or calculated from opening time)
 * Uses agency operating hours dynamically
 */
const isMorningClockInWindowOpen = (
  agency: Agency | null,
  currentTime: Date
): boolean => {
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const boundaries = calculateTimeBoundaries(agency);
  
  // Morning window is open if current time <= morning cutoff (inclusive)
  return currentTimeMinutes <= boundaries.morningCutoff;
};

/**
 * Determine session type based on server time and agency settings
 * This ensures session determination cannot be manipulated by client device time
 * 
 * STRICT TIME RULES:
 * - Morning clock-in: Available until 10:59 AM (or lunch start if earlier)
 * - Afternoon clock-in: Available if:
 *   - Current time >= 11:00 AM AND no morning clock-in exists, OR
 *   - Morning session is complete (both in and out)
 * - Overtime: Requires only afternoon session complete (morning can be skipped)
 */
export const determineSessionType = (
  agency: Agency | null,
  currentTime: Date,
  existingRecord: any
): "morning" | "afternoon" | "overtime" => {
  // Check for overtime (only requires afternoon completion, not morning)
  const afternoonComplete =
    existingRecord?.afternoonTimeIn && existingRecord?.afternoonTimeOut;

  // If afternoon session is complete, allow overtime
  if (afternoonComplete) {
    // Check if overtime is already in progress or complete
    if (existingRecord?.overtimeTimeIn && !existingRecord?.overtimeTimeOut) {
      throw new Error(
        "Overtime session is already in progress. Please clock out first."
      );
    }
    if (existingRecord?.overtimeTimeIn && existingRecord?.overtimeTimeOut) {
      throw new Error("Overtime session is already complete for today.");
    }
    return "overtime";
  }

  // Check for in-progress sessions
  const morningInProgress =
    existingRecord?.morningTimeIn && !existingRecord?.morningTimeOut;
  const afternoonInProgress =
    existingRecord?.afternoonTimeIn && !existingRecord?.afternoonTimeOut;

  // If any session is in progress, cannot clock in (must clock out first)
  if (morningInProgress || afternoonInProgress) {
    const inProgressSession = morningInProgress ? "morning" : "afternoon";
    throw new Error(
      `You have an active ${inProgressSession} session. Please clock out before clocking in again.`
    );
  }

  const hasMorningClockIn = !!existingRecord?.morningTimeIn;
  const morningComplete =
    existingRecord?.morningTimeIn && existingRecord?.morningTimeOut;

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const boundaries = calculateTimeBoundaries(agency);

  // If no morning clock-in exists
  if (!hasMorningClockIn) {
    // Check if morning window is still open (based on agency hours)
    if (isMorningClockInWindowOpen(agency, currentTime)) {
      return "morning";
    } else {
      // After morning cutoff, allow afternoon clock-in if no morning exists
      return "afternoon";
    }
  }

  // If morning exists and is complete, determine based on time
  if (morningComplete) {
    // Morning is done, check if we should allow afternoon
    const lunchStart = parseTimeToMinutes(agency?.lunchStartTime);
    
    if (lunchStart !== null) {
      // Use lunch start as divider (exclusive: < lunchStart = morning, >= lunchStart = afternoon)
      return currentTimeMinutes < lunchStart ? "morning" : "afternoon";
    } else {
      // No lunch time, use morning boundary as divider (exclusive)
      return currentTimeMinutes < boundaries.morningBoundary ? "morning" : "afternoon";
    }
  }

  // If morning exists but not complete, this shouldn't happen (should be caught by in-progress check)
  // But fallback: determine based on time
  const lunchStart = parseTimeToMinutes(agency?.lunchStartTime);
  if (lunchStart !== null) {
    return currentTimeMinutes < lunchStart ? "morning" : "afternoon";
  }

  // Default: use morning boundary as divider (exclusive)
  return currentTimeMinutes < boundaries.morningBoundary ? "morning" : "afternoon";
};

/**
 * Calculate remarks (Late/Early Departure) based on server time
 * This ensures remarks cannot be manipulated by client device time
 */
export const calculateRemarks = (
  agency: Agency | null,
  currentTime: Date,
  sessionType: "morning" | "afternoon" | "overtime",
  isClockIn: boolean
): "Normal" | "Late" | "Early Departure" => {
  if (sessionType === "overtime") {
    return "Normal";
  }

  // Convert current time to minutes since midnight for accurate comparison
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  if (isClockIn) {
    // For clock-in: check if late
    if (sessionType === "morning" && agency?.openingTime) {
      const openingMinutes = parseTimeToMinutes(agency.openingTime);
      if (openingMinutes !== null) {
        // Compare minutes since midnight
        if (currentTimeMinutes > openingMinutes) {
          return "Late";
        }
      }
    } else if (sessionType === "afternoon" && agency?.lunchEndTime) {
      // lunchEndTime is a reference point for determining if afternoon clock-in is late
      const lunchEndMinutes = parseTimeToMinutes(agency.lunchEndTime);
      if (lunchEndMinutes !== null) {
        // Handle midnight crossover: if lunchEnd is early morning (before 6 AM) and clock-in is late night (after 8 PM)
        // This means lunchEnd is the next day, so clock-in at 11 PM is BEFORE 1 AM next day = NOT late
        if (lunchEndMinutes < 360 && currentTimeMinutes > 1200) {
          // Lunch end is early morning (next day), clock-in is late night (current day)
          // Check if clock-in is before lunch end (considering it's the next day)
          // If lunchEnd is 1:00 AM (60 min) and clock-in is 11:00 PM (1380 min)
          // We need to check: is 1380 < (60 + 1440)? Yes, so it's not late
          const lunchEndNextDay = lunchEndMinutes + (24 * 60); // Add 24 hours
          if (currentTimeMinutes < lunchEndNextDay) {
            return "Normal"; // Clock-in is before lunch end (next day), so not late
          } else {
            return "Late"; // Clock-in is after lunch end (next day), so late
          }
        } else {
          // Normal case: compare on same day
          if (currentTimeMinutes > lunchEndMinutes) {
            return "Late";
          }
        }
      }
    }
    return "Normal";
  } else {
    // For clock-out: check if early departure
    if (sessionType === "morning" && agency?.lunchStartTime) {
      // lunchStartTime is a reference point for determining if morning clock-out is early
      const lunchStartMinutes = parseTimeToMinutes(agency.lunchStartTime);
      if (lunchStartMinutes !== null) {
        // Compare minutes since midnight
        if (currentTimeMinutes < lunchStartMinutes) {
          return "Early Departure";
        }
      }
    } else if (sessionType === "afternoon" && agency?.closingTime) {
      const closingMinutes = parseTimeToMinutes(agency.closingTime);
      if (closingMinutes !== null) {
        // Handle midnight crossover: if closing is early morning (before 6 AM) and clock-out is late night (after 8 PM)
        // This means closing is the next day, so clock-out at 11 PM is BEFORE 1 AM next day = Early Departure
        if (closingMinutes < 360 && currentTimeMinutes > 1200) {
          // Closing is early morning (next day), clock-out is late night (current day)
          // Check if clock-out is before closing (considering it's the next day)
          const closingNextDay = closingMinutes + (24 * 60); // Add 24 hours
          if (currentTimeMinutes < closingNextDay) {
            return "Early Departure"; // Clock-out is before closing (next day), so early
          } else {
            return "Normal"; // Clock-out is after closing (next day), so normal
          }
        } else {
          // Normal case: compare on same day
          if (currentTimeMinutes < closingMinutes) {
            return "Early Departure";
          }
        }
      }
    }
    return "Normal";
  }
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

  const lunchMs =
    new Date(afternoonTimeIn).getTime() - new Date(morningTimeOut).getTime();
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
    const morningMs =
      new Date(morningTimeOut).getTime() - new Date(morningTimeIn).getTime();
    totalHours += Math.max(0, morningMs / (1000 * 60 * 60));
  }

  // Calculate afternoon hours
  if (afternoonTimeIn && afternoonTimeOut) {
    const afternoonMs =
      new Date(afternoonTimeOut).getTime() -
      new Date(afternoonTimeIn).getTime();
    totalHours += Math.max(0, afternoonMs / (1000 * 60 * 60));
  }

  // Lunch time is automatically excluded since we calculate morning and afternoon separately
  // The gap between morningTimeOut and afternoonTimeIn is the lunch break
  return Math.round(totalHours * 100) / 100;
};

/**
 * Check and nullify missed clock-out windows
 * - Morning clock-out: Must be during lunch window (12:00 PM - 12:59 PM), otherwise nullify
 * - Afternoon clock-out: Must be after 5:00 PM - 6:00 PM (or after closing time), otherwise nullify
 * 
 * IMPORTANT: This function should NOT be called when user is actively clocking out.
 * It's designed to clean up stale sessions before new clock-in operations.
 */
export const checkAndNullifyMissedClockOuts = async (
  record: any,
  agency: Agency | null,
  currentTime: Date,
  isClockOutOperation: boolean = false
): Promise<void> => {
  if (!record) return;

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const updates: any = {};

  // Morning clock-out nullification
  // If morningTimeIn exists but morningTimeOut is null, and we're past lunch window
  // Morning clock-out must happen during lunch window (lunchStartTime - lunchEndTime inclusive)
  if (record.morningTimeIn && !record.morningTimeOut) {
    // Don't nullify if user is actively clocking out (race condition prevention)
    if (isClockOutOperation) {
      // Allow clock-out even if past window (user might have valid reason)
      // But we'll still validate the window in clockOutData
      return;
    }

    const boundaries = calculateTimeBoundaries(agency);
    
    // Check if we're past the lunch window
    // Deadline is lunch end + 1 minute (exclusive: past lunch end means nullify)
    const lunchWindowDeadline = boundaries.lunchWindowEnd + 1;
    const isPastLunchWindow = currentTimeMinutes > lunchWindowDeadline;

    if (isPastLunchWindow) {
      // Nullify entire morning session (both in and out)
      updates.morningTimeIn = null;
      updates.morningTimeOut = null;
    }
  }

  // Afternoon clock-out nullification
  // If afternoonTimeIn exists but afternoonTimeOut is null, and we're past deadline
  // Afternoon clock-out must happen after closing time (or closing + 1 hour)
  if (record.afternoonTimeIn && !record.afternoonTimeOut) {
    // Don't nullify if user is actively clocking out (race condition prevention)
    if (isClockOutOperation) {
      // Allow clock-out even if past window (user might have valid reason)
      // But we'll still validate the window in clockOutData
      return;
    }

    const boundaries = calculateTimeBoundaries(agency);
    
    // Check if we're past the deadline (after closing + 1 hour, exclusive)
    // Deadline is exclusive: deadline time is valid, deadline + 1 minute is not
    if (currentTimeMinutes > boundaries.afternoonClockOutDeadline) {
      // Nullify entire afternoon session (both in and out)
      updates.afternoonTimeIn = null;
      updates.afternoonTimeOut = null;
    }
  }

  if (Object.keys(updates).length > 0) {
    await record.update(updates);
    // Also update the record object passed in for immediate use
    Object.assign(record, updates);
  }
};

// Helper function to nullify incomplete sessions at end of day
export const nullifyIncompleteSessions = async (
  studentId: string,
  practicumId: string,
  date: Date
) => {
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

  // SECURITY: Always use server date, ignore client-provided date to prevent manipulation
  // Get the local date components to ensure we're using the correct day
  const localDateStr = now.toLocaleDateString("en-CA", {
    timeZone: serverTimeZone,
  }); // YYYY-MM-DD format
  const [year, month, day] = localDateStr.split("-").map(Number);
  const recordDate = new Date(year, month - 1, day);

  // Use "en-US" locale with server's timezone to get the correct day name
  const dayName = recordDate.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: serverTimeZone,
  });

  // NOTE: Agency lunch times (lunchStartTime, lunchEndTime) are REFERENCE POINTS ONLY
  // They are used for session determination and remarks calculation,
  // NOT for hours calculation. Actual lunch duration is calculated dynamically as:
  // afternoonTimeIn - morningTimeOut

  // Get existing record first to determine session type
  let record = await AttendanceRecord.findOne({
    where: {
      studentId: params.studentId,
      practicumId: params.practicumId,
      date: recordDate as any,
    },
  });

  // Validate agency data (only log warnings, don't block - times might be in different formats)
  if (params.agency) {
    // Check time formats but don't throw errors - parseTimeToMinutes handles various formats
    // Times might be stored as "HH:MM", "HH:MM:SS", or other formats
    const lunchStart = parseTimeToMinutes(params.agency.lunchStartTime);
    const lunchEnd = parseTimeToMinutes(params.agency.lunchEndTime);
    const opening = parseTimeToMinutes(params.agency.openingTime);
    const closing = parseTimeToMinutes(params.agency.closingTime);
    
    // Only log warnings if times are provided but can't be parsed
    if (params.agency.lunchStartTime && lunchStart === null) {
      console.warn(`[Time validation] Could not parse lunch start time: ${params.agency.lunchStartTime}`);
    }
    if (params.agency.lunchEndTime && lunchEnd === null) {
      console.warn(`[Time validation] Could not parse lunch end time: ${params.agency.lunchEndTime}`);
    }
    if (params.agency.openingTime && opening === null) {
      console.warn(`[Time validation] Could not parse opening time: ${params.agency.openingTime}`);
    }
    if (params.agency.closingTime && closing === null) {
      console.warn(`[Time validation] Could not parse closing time: ${params.agency.closingTime}`);
    }
  }

  // Check and nullify missed clock-out windows before determining session type
  // Only nullify if NOT a clock-out operation (prevent race conditions)
  if (record && params.agency) {
    await checkAndNullifyMissedClockOuts(record, params.agency, now, false);
    // Reload record to get updated values (use fresh query to avoid stale data)
    record = await AttendanceRecord.findOne({
      where: {
        studentId: params.studentId,
        practicumId: params.practicumId,
        date: recordDate as any,
      },
    });
  }

  // SECURITY: Determine session type on server side based on server time
  // This prevents client from manipulating device time to change session
  const sessionType = determineSessionType(params.agency ?? null, now, record);

  // Validate operating day
  if (params.agency) {
    if (!checkOperatingDay(params.agency, recordDate)) {
      // Format operating days for error message
      const operatingDaysList = params.agency.operatingDays
        ? String(params.agency.operatingDays)
            .split(",")
            .map((d) => d.trim())
            .join(",")
        : "Not set";
      throw new Error(
        `Today (${dayName}) is not an operating day. Operating days: ${operatingDaysList}`
      );
    }

    // Validate operating hours
    const hoursCheck = checkOperatingHours(params.agency, now, sessionType);
    if (!hoursCheck.valid) {
      throw new Error(
        hoursCheck.message || "Clock-in time is outside operating hours"
      );
    }
  }

  // SECURITY: Calculate remarks on server side based on server time
  // This prevents client from manipulating device time to change remarks
  const remarks = calculateRemarks(
    params.agency ?? null,
    now,
    sessionType,
    true
  );

  const updateData: any = {
    latitude: params.latitude ?? null,
    longitude: params.longitude ?? null,
    address: params.address ?? null,
    timeInLocationType: params.locationType ?? (null as any),
    timeInDeviceType: params.deviceType ?? (null as any),
    timeInDeviceUnit: params.deviceUnit ?? null,
    timeInMacAddress: params.macAddress ?? null,
    timeInRemarks: remarks,
    approvalStatus: "Approved",
    photoIn: params.photoUrl ?? null,
    sessionType:
      sessionType === "morning" ||
      sessionType === "afternoon" ||
      sessionType === "overtime"
        ? sessionType
        : "full_day",
  };

  if (sessionType === "morning") {
    // Check if already clocked in for morning
    if (record?.morningTimeIn && !record.morningTimeOut) {
      throw new Error(
        "You are already clocked in for the morning session. Please clock out first."
      );
    }
    // Idempotency check: prevent duplicate clock-ins within 5 seconds
    if (record?.morningTimeIn) {
      const lastClockIn = new Date(record.morningTimeIn);
      const timeDiff = now.getTime() - lastClockIn.getTime();
      if (timeDiff < 5000) { // 5 seconds
        // Return existing record to prevent duplicate
        return record;
      }
    }
    updateData.morningTimeIn = now;
    updateData.timeIn = now; // Keep for backward compatibility
  } else if (sessionType === "afternoon") {
    // Check if already clocked in for afternoon
    if (record?.afternoonTimeIn && !record.afternoonTimeOut) {
      throw new Error(
        "You are already clocked in for the afternoon session. Please clock out first."
      );
    }
    // Idempotency check: prevent duplicate clock-ins within 5 seconds
    if (record?.afternoonTimeIn) {
      const lastClockIn = new Date(record.afternoonTimeIn);
      const timeDiff = now.getTime() - lastClockIn.getTime();
      if (timeDiff < 5000) { // 5 seconds
        // Return existing record to prevent duplicate
        return record;
      }
    }
    // Ensure morning session is completed or nullified
    // Only nullify if morning session exists but is incomplete (not already nullified)
    if (record?.morningTimeIn && !record.morningTimeOut) {
      // Check if morning session should be nullified based on time
      // If it's past lunch window, nullify it
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      const boundaries = calculateTimeBoundaries(params.agency ?? null);
      const lunchWindowEnd = boundaries.lunchWindowEnd + 1; // Exclusive deadline
      
      if (currentTimeMinutes > lunchWindowEnd) {
        // Nullify incomplete morning session (already past window)
        updateData.morningTimeIn = null;
        updateData.morningTimeOut = null;
      }
    }
    updateData.afternoonTimeIn = now;
    updateData.timeIn = now; // Keep for backward compatibility
  } else if (sessionType === "overtime") {
    // Check if already clocked in for overtime
    if (record?.overtimeTimeIn && !record.overtimeTimeOut) {
      throw new Error(
        "You are already clocked in for the overtime session. Please clock out first."
      );
    }
    // Idempotency check: prevent duplicate clock-ins within 5 seconds
    if (record?.overtimeTimeIn) {
      const lastClockIn = new Date(record.overtimeTimeIn);
      const timeDiff = now.getTime() - lastClockIn.getTime();
      if (timeDiff < 5000) { // 5 seconds
        // Return existing record to prevent duplicate
        return record;
      }
    }
    // Only require afternoon session to be complete (morning can be skipped)
    const afternoonComplete =
      record?.afternoonTimeIn && record?.afternoonTimeOut;
    if (!afternoonComplete) {
      throw new Error(
        "You must complete the afternoon session before clocking in for overtime."
      );
    }
    updateData.overtimeTimeIn = now;
    updateData.timeIn = now; // Keep for backward compatibility
  }

  if (!record) {
    updateData.studentId = params.studentId;
    updateData.practicumId = params.practicumId;
    updateData.date = recordDate as any;
    updateData.day = dayName;
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
    timeInRemarks: remarks,
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
  // SECURITY: Always use server date, ignore client-provided date to prevent manipulation
  const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDateStr = now.toLocaleDateString("en-CA", {
    timeZone: serverTimeZone,
  }); // YYYY-MM-DD format
  const [year, month, day] = localDateStr.split("-").map(Number);
  const recordDate = new Date(year, month - 1, day);

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

  // Validate agency data (only log warnings, don't block - times might be in different formats)
  if (params.agency) {
    // Check time formats but don't throw errors - parseTimeToMinutes handles various formats
    // Times might be stored as "HH:MM", "HH:MM:SS", or other formats
    const lunchStart = parseTimeToMinutes(params.agency.lunchStartTime);
    const lunchEnd = parseTimeToMinutes(params.agency.lunchEndTime);
    const closing = parseTimeToMinutes(params.agency.closingTime);
    
    // Only log warnings if times are provided but can't be parsed
    if (params.agency.lunchStartTime && lunchStart === null) {
      console.warn(`[Time validation] Could not parse lunch start time: ${params.agency.lunchStartTime}`);
    }
    if (params.agency.lunchEndTime && lunchEnd === null) {
      console.warn(`[Time validation] Could not parse lunch end time: ${params.agency.lunchEndTime}`);
    }
    if (params.agency.closingTime && closing === null) {
      console.warn(`[Time validation] Could not parse closing time: ${params.agency.closingTime}`);
    }
  }

  // Check and nullify missed clock-out windows before processing clock-out
  // Pass isClockOutOperation=true to prevent nullification during active clock-out
  if (params.agency) {
    await checkAndNullifyMissedClockOuts(record, params.agency, now, true);
    // Reload record to get updated values (use fresh query to avoid stale data)
    const updatedRecord = await AttendanceRecord.findOne({
      where: {
        studentId: params.studentId,
        practicumId: params.practicumId,
        date: recordDate as any,
      },
    });
    if (updatedRecord) {
      Object.assign(record, updatedRecord.toJSON());
    }
  }

  // SECURITY: Determine session type based on which session is in progress
  // This prevents client from manipulating device time to change session
  let sessionType: "morning" | "afternoon" | "overtime";
  const morningInProgress = record.morningTimeIn && !record.morningTimeOut;
  const afternoonInProgress =
    record.afternoonTimeIn && !record.afternoonTimeOut;
  const overtimeInProgress = record.overtimeTimeIn && !record.overtimeTimeOut;

  if (overtimeInProgress) {
    sessionType = "overtime";
  } else if (afternoonInProgress) {
    sessionType = "afternoon";
  } else if (morningInProgress) {
    sessionType = "morning";
  } else {
    // Fallback: use client-provided sessionType if no session is in progress
    // This should rarely happen, but provides backward compatibility
    sessionType = params.sessionType || "morning";
  }

  // Validate clock-out window (warn but don't block - user might have valid reason)
  if (params.agency && sessionType !== "overtime") {
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    const boundaries = calculateTimeBoundaries(params.agency);
    
    if (sessionType === "morning") {
      // Morning clock-out should be during lunch window (lunchStartTime - lunchEndTime)
      const isValidWindow = currentTimeMinutes >= boundaries.lunchWindowStart && 
                           currentTimeMinutes <= boundaries.lunchWindowEnd;
      
      if (!isValidWindow) {
        // Log warning but allow clock-out (user might have valid reason)
        const lunchStartStr = params.agency.lunchStartTime || "12:00 PM";
        const lunchEndStr = params.agency.lunchEndTime || "12:59 PM";
        console.warn(`[Clock-out validation] Morning clock-out at ${now.toLocaleTimeString()} is outside lunch window (${lunchStartStr} - ${lunchEndStr})`);
      }
    } else if (sessionType === "afternoon") {
      // Afternoon clock-out should be after closing time (closingTime - closingTime + 1 hour)
      const isValidWindow = currentTimeMinutes >= boundaries.afternoonClockOutStart && 
                           currentTimeMinutes <= boundaries.afternoonClockOutDeadline;
      
      if (!isValidWindow) {
        // Log warning but allow clock-out (user might have valid reason)
        const closingStr = params.agency.closingTime || "5:00 PM";
        const deadlineStr = `${Math.floor(boundaries.afternoonClockOutDeadline / 60)}:${String(boundaries.afternoonClockOutDeadline % 60).padStart(2, '0')}`;
        console.warn(`[Clock-out validation] Afternoon clock-out at ${now.toLocaleTimeString()} is outside window (after ${closingStr} - ${deadlineStr})`);
      }
    }
  }

  // Validate operating hours
  if (params.agency) {
    const hoursCheck = checkOperatingHours(params.agency, now, sessionType);
    if (!hoursCheck.valid) {
      throw new Error(
        hoursCheck.message || "Clock-out time is outside operating hours"
      );
    }
  }

  // SECURITY: Calculate remarks on server side based on server time
  // This prevents client from manipulating device time to change remarks
  const remarks = calculateRemarks(
    params.agency ?? null,
    now,
    sessionType,
    false
  );

  const updateData: any = {
    timeOutLocationType:
      params.locationType ?? record.timeOutLocationType ?? null,
    timeOutDeviceType: params.deviceType ?? record.timeOutDeviceType ?? null,
    timeOutDeviceUnit: params.deviceUnit ?? record.timeOutDeviceUnit ?? null,
    timeOutMacAddress: params.macAddress ?? record.timeOutMacAddress ?? null,
    timeOutRemarks: remarks,
    approvalStatus: "Approved",
    photoOut: params.photoUrl ?? record.photoOut ?? null,
    latitude: params.latitude ?? record.latitude ?? null,
    longitude: params.longitude ?? record.longitude ?? null,
    address: params.address ?? record.address ?? null,
  };

  if (sessionType === "morning") {
    // Check if clocked in for morning
    if (!record.morningTimeIn) {
      throw new Error(
        "You must clock in for the morning session before clocking out"
      );
    }
    if (record.morningTimeOut) {
      throw new Error("You have already clocked out for the morning session");
    }
    updateData.morningTimeOut = now;
    updateData.timeOut = now; // Keep for backward compatibility
  } else if (sessionType === "afternoon") {
    // Check if clocked in for afternoon
    if (!record.afternoonTimeIn) {
      throw new Error(
        "You must clock in for the afternoon session before clocking out"
      );
    }
    if (record.afternoonTimeOut) {
      throw new Error("You have already clocked out for the afternoon session");
    }
    updateData.afternoonTimeOut = now;
    updateData.timeOut = now; // Keep for backward compatibility
  } else if (sessionType === "overtime") {
    // Check if clocked in for overtime
    if (!record.overtimeTimeIn) {
      throw new Error(
        "You must clock in for the overtime session before clocking out"
      );
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
  const overtimeTimeIn =
    record.overtimeTimeIn || updateData.overtimeTimeIn || null;
  const overtimeTimeOut =
    record.overtimeTimeOut || updateData.overtimeTimeOut || null;
  if (overtimeTimeIn && overtimeTimeOut) {
    const overtimeMs =
      new Date(overtimeTimeOut).getTime() - new Date(overtimeTimeIn).getTime();
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
      timeOutRemarks: remarks,
      timeOutExactLocation: params.address ?? null,
    } as any);
  }

  return record;
};

// approval workflow removed per product decision
