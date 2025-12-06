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
import Section from "./section";
import Course from "./course";
import Department from "./department";
import AttendanceRecord from "./attendance-record";
import Report from "./report";
import Requirement from "./requirement";

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
	@Column({ type: DataType.UUID, allowNull: true })
	declare supervisorId: string | null;

	@ForeignKey(() => Section)
	@Column({ type: DataType.UUID, allowNull: true })
	declare sectionId: string;

	@ForeignKey(() => Course)
	@Column({ type: DataType.UUID, allowNull: true })
	declare courseId: string;

	@ForeignKey(() => Department)
	@Column({ type: DataType.UUID, allowNull: true })
	declare departmentId: string;

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
		type: DataType.ENUM("active", "completed", "inactive", "suspended", "terminated"),
		allowNull: false,
		defaultValue: "active",
	})
	declare status: "active" | "completed" | "inactive" | "suspended" | "terminated";

	@Column({ type: DataType.TEXT, allowNull: true })
	declare objectives: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare responsibilities: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare academicYear: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare semester: string;

	@Column({ type: DataType.DATE, allowNull: true })
	declare evaluationDate: Date;

	@Column({ type: DataType.FLOAT, allowNull: true })
	declare finalGrade: number;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare remarks: string;

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

	@BelongsTo(() => Section, "sectionId")
	declare section: Section;

	@BelongsTo(() => Course, "courseId")
	declare course: Course;

	@BelongsTo(() => Department, "departmentId")
	declare department: Department;

	@HasMany(() => AttendanceRecord, "practicumId")
	declare attendanceRecords: AttendanceRecord[];

	@HasMany(() => Report, "practicumId")
	declare reports: Report[];

	@HasMany(() => Requirement, "practicumId")
	declare requirements: Requirement[];
}


