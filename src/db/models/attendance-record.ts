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

	@Column({ type: DataType.FLOAT, allowNull: true })
	declare hours: number;

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

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => User, "studentId")
	declare student: User;

	@BelongsTo(() => Practicum, "practicumId")
	declare practicum: Practicum;

	@HasOne(() => DetailedAttendanceLog, "attendanceRecordId")
	declare detailedLog: DetailedAttendanceLog;
}


