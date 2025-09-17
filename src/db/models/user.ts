import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
	Table,
	Column,
	Model,
	DataType,
	CreatedAt,
	UpdatedAt,
	BeforeCreate,
	HasMany,
	BeforeUpdate,
	ForeignKey,
	BelongsTo,
    Unique,
} from "sequelize-typescript";
import dotenv from "dotenv";
import Department from "./department";
import Section from "./section";
import StudentEnrollment from "./student-enrollment";
import Practicum from "./practicum";
import AttendanceRecord from "./attendance-record";
import Report from "./report";
import Requirement from "./requirement";
import Announcement from "./announcement";
import AuditLog from "./audit-log";
import Achievement from "./achievement";
import FileAttachment from "./file-attachment";
dotenv.config();

export enum UserRole {
	ADMIN = "admin",
	INSTRUCTOR = "instructor",
	STUDENT = "student",
	USER = "user",
	MECHANIC = "mechanic",
}

export enum Gender {
	MALE = "male",
	FEMALE = "female",
	OTHER = "other",
}

@Table({
	tableName: "users",
	timestamps: true,
	modelName: "User",
})
export default class User extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare firstName: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare lastName: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare middleName: string;

	@Unique("users_email_unique")
	@Column({
		type: DataType.STRING,
		allowNull: false,
		validate: { isEmail: true },
	})
	declare email: string;

	@Column({ type: DataType.INTEGER, allowNull: false })
	declare age: number;

	@Column({ type: DataType.STRING, allowNull: false })
	declare phone: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare password: string;

	@Column({
		type: DataType.ENUM("admin", "instructor", "student", "user", "mechanic"),
		allowNull: false,
		defaultValue: UserRole.STUDENT,
	})
	declare role: UserRole;

	@Column({
		type: DataType.ENUM("male", "female", "other"),
		allowNull: false,
	})
	declare gender: Gender;

	@Column({ type: DataType.STRING, allowNull: true })
	declare avatar: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare address: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare bio: string;

	@Unique("users_student_id_unique")
	@Column({
		type: DataType.STRING,
		allowNull: true,
	})
	declare studentId: string;

	@Unique("users_instructor_id_unique")
	@Column({
		type: DataType.STRING,
		allowNull: true,
	})
	declare instructorId: string;

	@ForeignKey(() => Department)
	@Column({ type: DataType.UUID, allowNull: true })
	declare departmentId: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare yearLevel: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare program: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare specialization: string;

	@Column({ type: DataType.DATE, allowNull: true })
	declare enrollmentDate: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare graduationDate: Date;

	@Column({
		type: DataType.BOOLEAN,
		defaultValue: true,
	})
	declare isActive: boolean;

	@Column({
		type: DataType.BOOLEAN,
		defaultValue: false,
	})
	declare emailVerified: boolean;

	@Column({ type: DataType.DATE, allowNull: true })
	declare lastLoginAt: Date;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => Department, "departmentId")
	declare department: Department;

	@HasMany(() => Department, "headId")
	declare departmentsHeaded: Department[];

	@HasMany(() => Section, "instructorId")
	declare sectionsInstructed: Section[];

	@HasMany(() => StudentEnrollment, "studentId")
	declare enrollments: StudentEnrollment[];

	@HasMany(() => Practicum, "studentId")
	declare practicums: Practicum[];

	@HasMany(() => AttendanceRecord, "studentId")
	declare attendanceRecords: AttendanceRecord[];

	@HasMany(() => Report, "studentId")
	declare reports: Report[];

	@HasMany(() => Report, "approvedBy")
	declare approvedReports: Report[];

	@HasMany(() => Requirement, "studentId")
	declare requirements: Requirement[];

	@HasMany(() => Requirement, "approvedBy")
	declare approvedRequirements: Requirement[];

	@HasMany(() => Announcement, "authorId")
	declare announcements: Announcement[];

	@HasMany(() => AuditLog, "userId")
	declare auditLogs: AuditLog[];

	@HasMany(() => Achievement, "studentId")
	declare achievements: Achievement[];

	@HasMany(() => Achievement, "awardedBy")
	declare awardedAchievements: Achievement[];

	@HasMany(() => FileAttachment, "uploadedBy")
	declare uploads: FileAttachment[];

	@BeforeCreate
	static async hashPassword(instance: User) {
		if (instance.password) {
			instance.password = await bcrypt.hash(instance.password, 10);
		}
	}

	@BeforeUpdate
	static async hashPasswordOnUpdate(instance: User) {
		if (instance.password && instance.password !== "" && instance.changed('password')) {
			if (!instance.password.startsWith('$2a$') && !instance.password.startsWith('$2b$')) {
				instance.password = await bcrypt.hash(instance.password, 10);
			}
		}
	}

	public SignAccessToken(): string {
		return jwt.sign({ id: this.id }, process.env.ACCESS_TOKEN_SECRET || "", {
			expiresIn: "1h",
		});
	}

	public SignRefreshToken(): string {
		return jwt.sign({ id: this.id }, process.env.REFRESH_TOKEN_SECRET || "", {
			expiresIn: "3d",
		});
	}

	public async comparePassword(enteredPassword: string): Promise<boolean> {
		return await bcrypt.compare(enteredPassword, this.password);
	}
}
