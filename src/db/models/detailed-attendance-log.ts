import {
	Table,
	Column,
	Model,
	DataType,
	CreatedAt,
	UpdatedAt,
	ForeignKey,
	BelongsTo,
} from "sequelize-typescript";
import AttendanceRecord from "./attendance-record";
import User from "./user";

@Table({
	tableName: "detailed_attendance_logs",
	timestamps: true,
	modelName: "DetailedAttendanceLog",
})
export default class DetailedAttendanceLog extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => AttendanceRecord)
	@Column({ type: DataType.UUID, allowNull: false })
	declare attendanceRecordId: string;

	@Column({
		type: DataType.ENUM("morning", "afternoon"),
		allowNull: true,
	})
	declare sessionType: "morning" | "afternoon";

	@Column({ type: DataType.STRING, allowNull: true })
	declare photoIn: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare photoOut: string;

	@Column({
		type: DataType.ENUM("Inside", "In-field", "Outside"),
		allowNull: false,
	})
	declare timeInLocationType: "Inside" | "In-field" | "Outside";

	@Column({
		type: DataType.ENUM("Mobile", "Desktop", "Tablet"),
		allowNull: false,
	})
	declare timeInDeviceType: "Mobile" | "Desktop" | "Tablet";

	@Column({ type: DataType.STRING, allowNull: true })
	declare timeInDeviceUnit: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare timeInMacAddress: string;

	@Column({
		type: DataType.ENUM("Normal", "Late", "Early"),
		allowNull: false,
		defaultValue: "Normal",
	})
	declare timeInRemarks: "Normal" | "Late" | "Early";

	@Column({ type: DataType.TEXT, allowNull: true })
	declare timeInExactLocation: string;

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

	@Column({
		type: DataType.ENUM("Pending", "Approved", "Declined"),
		allowNull: false,
		defaultValue: "Pending",
	})
	declare status: "Pending" | "Approved" | "Declined";

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: true })
	declare approvedBy: string;

	@Column({ type: DataType.DATE, allowNull: true })
	declare approvedAt: Date;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare notes: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => AttendanceRecord, "attendanceRecordId")
	declare attendanceRecord: AttendanceRecord;

	@BelongsTo(() => User, "approvedBy")
	declare approver: User;
}


