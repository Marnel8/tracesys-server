import { Op } from "sequelize";
import AttendanceRecord from "@/db/models/attendance-record";
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
	status?: "present" | "absent" | "late" | "excused" | "all";
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
			{ day: { [Op.iLike]: `%${search}%` } },
			{ '$student.firstName$': { [Op.iLike]: `%${search}%` } },
			{ '$student.lastName$': { [Op.iLike]: `%${search}%` } },
			{ '$student.studentId$': { [Op.iLike]: `%${search}%` } },
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
						attributes: ["id", "name", "address", "branchType", "openingTime", "closingTime", "contactPerson", "contactRole", "contactPhone", "contactEmail"]
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
						attributes: ["id", "name", "address", "branchType", "openingTime", "closingTime", "contactPerson", "contactRole", "contactPhone", "contactEmail"]
					}
				]
			},
		],
	});
	return record;
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
	remarks?: "Normal" | "Late" | "Early";
	photoUrl?: string | null;
}

export const clockInData = async (params: ClockInParams) => {
	const now = new Date();
	const recordDate = params.date ? new Date(params.date) : new Date(now.toISOString().slice(0, 10));
	const day = params.day ?? recordDate.toLocaleDateString(undefined, { weekday: "long" });

	let record = await AttendanceRecord.findOne({
		where: {
			studentId: params.studentId,
			practicumId: params.practicumId,
			date: recordDate as any,
		},
	});

	if (!record) {
		record = await AttendanceRecord.create({
			studentId: params.studentId,
			practicumId: params.practicumId,
			date: recordDate as any,
			day,
			status: params.remarks === "Late" ? "late" : "present",
			timeIn: now,
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
		} as any);
	} else {
		await record.update({
			timeIn: now,
			status: params.remarks === "Late" ? "late" : record.status ?? "present",
			latitude: params.latitude ?? record.latitude ?? null,
			longitude: params.longitude ?? record.longitude ?? null,
			address: params.address ?? record.address ?? null,
			timeInLocationType: params.locationType ?? record.timeInLocationType ?? null,
			timeInDeviceType: params.deviceType ?? record.timeInDeviceType ?? null,
			timeInDeviceUnit: params.deviceUnit ?? record.timeInDeviceUnit ?? null,
			timeInMacAddress: params.macAddress ?? record.timeInMacAddress ?? null,
			timeInRemarks: params.remarks ?? record.timeInRemarks ?? "Normal",
			approvalStatus: "Approved",
			photoIn: params.photoUrl ?? record.photoIn ?? null,
		});
	}

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
}

export const clockOutData = async (params: ClockOutParams) => {
	const now = new Date();
	const recordDate = params.date ? new Date(params.date) : new Date(now.toISOString().slice(0, 10));

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

	// Compute hours if timeIn exists
	let hours: number | null = record.hours ?? null;
	if (record.timeIn) {
		const diffMs = now.getTime() - new Date(record.timeIn).getTime();
		hours = Math.max(0, Math.round((diffMs / 3600000) * 100) / 100);
	}

	await record.update({
		timeOut: now,
		hours: hours ?? null,
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
	});

	return record;
};

// approval workflow removed per product decision


