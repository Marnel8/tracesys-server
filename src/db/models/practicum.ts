import {
	Table,
	Column,
	Model,
	DataType,
	CreatedAt,
	UpdatedAt,
	ForeignKey,
	BelongsTo,
	HasMany,
} from "sequelize-typescript";
import User from "./user";
import Agency from "./agency";
import Supervisor from "./supervisor";
import AttendanceRecord from "./attendance-record";
import Report from "./report";

@Table({
	tableName: "practicums",
	timestamps: true,
	modelName: "Practicum",
})
export default class Practicum extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare studentId: string;

	@ForeignKey(() => Agency)
	@Column({ type: DataType.UUID, allowNull: false })
	declare agencyId: string;

	@ForeignKey(() => Supervisor)
	@Column({ type: DataType.UUID, allowNull: false })
	declare supervisorId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare position: string;

	@Column({ type: DataType.DATE, allowNull: false })
	declare startDate: Date;

	@Column({ type: DataType.DATE, allowNull: false })
	declare endDate: Date;

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 400 })
	declare totalHours: number;

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
	declare completedHours: number;

	@Column({
		type: DataType.ENUM("On-site", "Hybrid", "Work From Home"),
		allowNull: false,
		defaultValue: "On-site",
	})
	declare workSetup: "On-site" | "Hybrid" | "Work From Home";

	@Column({
		type: DataType.ENUM("active", "completed", "inactive"),
		allowNull: false,
		defaultValue: "active",
	})
	declare status: "active" | "completed" | "inactive";

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => User, "studentId")
	declare student: User;

	@BelongsTo(() => Agency, "agencyId")
	declare agency: Agency;

	@BelongsTo(() => Supervisor, "supervisorId")
	declare supervisor: Supervisor;

	@HasMany(() => AttendanceRecord, "practicumId")
	declare attendanceRecords: AttendanceRecord[];

	@HasMany(() => Report, "practicumId")
	declare reports: Report[];
}


