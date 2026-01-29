import {
	Table,
	Column,
	Model,
	DataType,
	CreatedAt,
	UpdatedAt,
	ForeignKey,
	BelongsTo,
	HasOne,
	HasMany,
} from "sequelize-typescript";
import User from "./user";
import Practicum from "./practicum";
import DetailedAttendanceLog from "./detailed-attendance-log";

@Table({
	tableName: "attendance_records",
	timestamps: true,
	modelName: "AttendanceRecord",
})
export default class AttendanceRecord extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare studentId: string;

	@ForeignKey(() => Practicum)
	@Column({ type: DataType.UUID, allowNull: false })
	declare practicumId: string;

	@Column({ type: DataType.DATEONLY, allowNull: false })
	declare date: Date;

	@Column({ type: DataType.STRING, allowNull: false })
	declare day: string;

	@Column({ type: DataType.DATE, allowNull: true })
	declare timeIn: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare timeOut: Date;

	// Morning session fields
	@Column({ type: DataType.DATE, allowNull: true })
	declare morningTimeIn: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare morningTimeOut: Date;

	// Afternoon session fields
	@Column({ type: DataType.DATE, allowNull: true })
	declare afternoonTimeIn: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare afternoonTimeOut: Date;

	// Overtime session fields
	@Column({ type: DataType.DATE, allowNull: true })
	declare overtimeTimeIn: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare overtimeTimeOut: Date;

	// Session type for legacy records
	@Column({
		type: DataType.ENUM("morning", "afternoon", "full_day", "overtime"),
		allowNull: true,
	})
	declare sessionType: "morning" | "afternoon" | "full_day" | "overtime";

	@Column({ type: DataType.FLOAT, allowNull: true })
	declare hours: number;

	@Column({ type: DataType.FLOAT, allowNull: true })
	declare undertimeHours: number;

	@Column({
		type: DataType.ENUM("present", "absent", "late", "excused"),
		allowNull: false,
		defaultValue: "present",
	})
	declare status: "present" | "absent" | "late" | "excused";

	@Column({ type: DataType.DECIMAL(10, 8), allowNull: true })
	declare latitude: number;

	@Column({ type: DataType.DECIMAL(11, 8), allowNull: true })
	declare longitude: number;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare address: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare selfieImage: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare remarks: string;

	// Agency Information Fields
	@Column({ type: DataType.STRING, allowNull: true })
	declare agencyName: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare agencyLocation: string;

	@Column({
		type: DataType.ENUM("On-site", "Hybrid", "Work From Home"),
		allowNull: true,
	})
	declare workSetup: "On-site" | "Hybrid" | "Work From Home";

	@Column({
		type: DataType.ENUM("Main", "Branch"),
		allowNull: true,
	})
	declare branchType: "Main" | "Branch";

	@Column({ type: DataType.TIME, allowNull: true })
	declare openingTime: string;

	@Column({ type: DataType.TIME, allowNull: true })
	declare closingTime: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare contactPerson: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare contactRole: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare contactPhone: string;

	@Column({ type: DataType.STRING, allowNull: true, validate: { isEmail: true } })
	declare contactEmail: string;

	// Device Tracking Fields for Time In
	@Column({
		type: DataType.ENUM("Inside", "In-field", "Outside"),
		allowNull: true,
	})
	declare timeInLocationType: "Inside" | "In-field" | "Outside";

	@Column({
		type: DataType.ENUM("Mobile", "Desktop", "Tablet"),
		allowNull: true,
	})
	declare timeInDeviceType: "Mobile" | "Desktop" | "Tablet";

	@Column({ type: DataType.STRING, allowNull: true })
	declare timeInDeviceUnit: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare timeInMacAddress: string;

	@Column({
		type: DataType.ENUM("Normal", "Late", "Early"),
		allowNull: true,
		defaultValue: "Normal",
	})
	declare timeInRemarks: "Normal" | "Late" | "Early";

	@Column({ type: DataType.TEXT, allowNull: true })
	declare timeInExactLocation: string;

	// Device Tracking Fields for Time Out
	@Column({
		type: DataType.ENUM("Inside", "In-field", "Outside"),
		allowNull: true,
	})
	declare timeOutLocationType: "Inside" | "In-field" | "Outside";

	@Column({
		type: DataType.ENUM("Mobile", "Desktop", "Tablet"),
		allowNull: true,
	})
	declare timeOutDeviceType: "Mobile" | "Desktop" | "Tablet";

	@Column({ type: DataType.STRING, allowNull: true })
	declare timeOutDeviceUnit: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare timeOutMacAddress: string;

	@Column({
		type: DataType.ENUM("Normal", "Early Departure", "Overtime"),
		allowNull: true,
	})
	declare timeOutRemarks: "Normal" | "Early Departure" | "Overtime";

	@Column({ type: DataType.TEXT, allowNull: true })
	declare timeOutExactLocation: string;

	// Photo Fields
	@Column({ type: DataType.STRING, allowNull: true })
	declare photoIn: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare photoOut: string;

	// Approval Workflow Fields
	@Column({
		type: DataType.ENUM("Pending", "Approved", "Declined"),
		allowNull: false,
		defaultValue: "Pending",
	})
	declare approvalStatus: "Pending" | "Approved" | "Declined";

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: true })
	declare approvedBy: string;

	@Column({ type: DataType.DATE, allowNull: true })
	declare approvedAt: Date;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare approvalNotes: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => User, "studentId")
	declare student: User;

	@BelongsTo(() => Practicum, "practicumId")
	declare practicum: Practicum;

	@BelongsTo(() => User, "approvedBy")
	declare approver: User;

	@HasOne(() => DetailedAttendanceLog, "attendanceRecordId")
	declare detailedLog: DetailedAttendanceLog;

	// Support multiple detailed logs (one per session)
	@HasMany(() => DetailedAttendanceLog, "attendanceRecordId")
	declare detailedLogs?: DetailedAttendanceLog[];
}


