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

	@Column({
		type: DataType.STRING,
		allowNull: false,
		unique: true,
		validate: { isEmail: true },
	})
	declare email: string;

	@Column({ type: DataType.INTEGER, allowNull: true })
	declare age: number;

	@Column({ type: DataType.STRING, allowNull: false })
	declare contactNumber: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare password: string;

	@Column({
		type: DataType.ENUM("admin", "instructor", "student", "user", "mechanic"),
		allowNull: false,
		defaultValue: UserRole.USER,
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

	@Column({
		type: DataType.STRING,
		allowNull: true,
		unique: true,
	})
	declare studentId: string;

	@Column({
		type: DataType.STRING,
		allowNull: true,
		unique: true,
	})
	declare instructorId: string;

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
		if (instance.password) {
			instance.password = await bcrypt.hash(instance.password, 10);
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
