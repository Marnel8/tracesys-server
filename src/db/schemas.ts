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
	BeforeUpdate,
	HasMany,
	BelongsTo,
	ForeignKey,
	HasOne,
	BelongsToMany,
} from "sequelize-typescript";

// ================================
// ENUMS AND TYPES
// ================================

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

// ================================
// USER MANAGEMENT MODEL
// ================================

@Table({
	tableName: "users",
	timestamps: true,
	modelName: "User",
})
export class User extends Model {
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

	@HasMany(() => AgencyRequirement, "createdBy")
	declare createdAgencyRequirements: AgencyRequirement[];

	// Instance methods from your existing model
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
}

// ================================
// ACADEMIC MODELS
// ================================

@Table({
	tableName: "departments",
	timestamps: true,
	modelName: "Department",
})
export class Department extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare name: string;

	@Column({ type: DataType.STRING, allowNull: false, unique: true })
	declare code: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare description: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: true })
	declare headId: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@Column({ type: DataType.STRING, allowNull: true })
	declare color: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare icon: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => User, "headId")
	declare head: User;

	@HasMany(() => Course, "departmentId")
	declare courses: Course[];

	@HasMany(() => Agency, "departmentId")
	declare agencies: Agency[];

	@HasMany(() => User, "departmentId")
	declare students: User[];
}

@Table({
	tableName: "courses",
	timestamps: true,
	modelName: "Course",
})
export class Course extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare name: string;

	@Column({ type: DataType.STRING, allowNull: false, unique: true })
	declare code: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare description: string;

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 3 })
	declare credits: number;

	@ForeignKey(() => Department)
	@Column({ type: DataType.UUID, allowNull: false })
	declare departmentId: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@Column({ type: DataType.STRING, allowNull: true })
	declare prerequisites: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare objectives: string;

	@Column({ type: DataType.INTEGER, allowNull: true })
	declare totalHours: number;

	@Column({ type: DataType.STRING, allowNull: true })
	declare level: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => Department, "departmentId")
	declare department: Department;

	@HasMany(() => Section, "courseId")
	declare sections: Section[];

	@HasMany(() => Practicum, "courseId")
	declare practicums: Practicum[];
}

@Table({
	tableName: "sections",
	timestamps: true,
	modelName: "Section",
})
export class Section extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare name: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare code: string;

	@ForeignKey(() => Course)
	@Column({ type: DataType.UUID, allowNull: false })
	declare courseId: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare instructorId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare year: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare semester: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare academicYear: string;

	@Column({ type: DataType.INTEGER, allowNull: true })
	declare maxStudents: number;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare description: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare schedule: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare room: string;

	@Column({ type: DataType.DATE, allowNull: true })
	declare startDate: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare endDate: Date;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => Course, "courseId")
	declare course: Course;

	@BelongsTo(() => User, "instructorId")
	declare instructor: User;

	@HasMany(() => StudentEnrollment, "sectionId")
	declare enrollments: StudentEnrollment[];

	@HasMany(() => Practicum, "sectionId")
	declare practicums: Practicum[];
}

@Table({
	tableName: "student_enrollments",
	timestamps: true,
	modelName: "StudentEnrollment",
})
export class StudentEnrollment extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare studentId: string;

	@ForeignKey(() => Section)
	@Column({ type: DataType.UUID, allowNull: false })
	declare sectionId: string;

	@Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
	declare enrollmentDate: Date;

	@Column({
		type: DataType.ENUM("enrolled", "dropped", "completed"),
		allowNull: false,
		defaultValue: "enrolled",
	})
	declare status: "enrolled" | "dropped" | "completed";

	@Column({ type: DataType.STRING, allowNull: true })
	declare finalGrade: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => User, "studentId")
	declare student: User;

	@BelongsTo(() => Section, "sectionId")
	declare section: Section;
}

// ================================
// PRACTICUM MODELS
// ================================

@Table({
	tableName: "agencies",
	timestamps: true,
	modelName: "Agency",
})
export class Agency extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare name: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare address: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare contactPerson: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare contactRole: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare contactPhone: string;

	@Column({
		type: DataType.STRING,
		allowNull: false,
		validate: { isEmail: true },
	})
	declare contactEmail: string;

	@Column({
		type: DataType.ENUM("Main", "Branch"),
		allowNull: false,
		defaultValue: "Main",
	})
	declare branchType: "Main" | "Branch";

	@Column({ type: DataType.TIME, allowNull: true })
	declare openingTime: string;

	@Column({ type: DataType.TIME, allowNull: true })
	declare closingTime: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@Column({ type: DataType.DECIMAL(10, 8), allowNull: true })
	declare latitude: number;

	@Column({ type: DataType.DECIMAL(11, 8), allowNull: true })
	declare longitude: number;

	@ForeignKey(() => Department)
	@Column({ type: DataType.UUID, allowNull: true })
	declare departmentId: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare description: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare website: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare industry: string;

	@Column({ type: DataType.INTEGER, allowNull: true })
	declare maxStudents: number;

	@Column({ type: DataType.STRING, allowNull: true })
	declare partnershipType: string;

	@Column({ type: DataType.DATE, allowNull: true })
	declare partnershipStartDate: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare partnershipEndDate: Date;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => Department, "departmentId")
	declare department: Department;

	@HasMany(() => Supervisor, "agencyId")
	declare supervisors: Supervisor[];

	@HasMany(() => Practicum, "agencyId")
	declare practicums: Practicum[];

	@HasMany(() => AgencyRequirement, "agencyId")
	declare requirements: AgencyRequirement[];
}

@Table({
	tableName: "agency_requirements",
	timestamps: true,
	modelName: "AgencyRequirement",
})
export class AgencyRequirement extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => Agency)
	@Column({ type: DataType.UUID, allowNull: false })
	declare agencyId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare description: string;

	@Column({
		type: DataType.ENUM("health", "academic", "legal", "training", "other"),
		allowNull: false,
	})
	declare category: "health" | "academic" | "legal" | "training" | "other";

	@Column({
		type: DataType.ENUM("required", "optional", "recommended"),
		allowNull: false,
		defaultValue: "required",
	})
	declare type: "required" | "optional" | "recommended";

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => Agency, "agencyId")
	declare agency: Agency;
}

@Table({
	tableName: "supervisors",
	timestamps: true,
	modelName: "Supervisor",
})
export class Supervisor extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => Agency)
	@Column({ type: DataType.UUID, allowNull: false })
	declare agencyId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare name: string;

	@Column({
		type: DataType.STRING,
		allowNull: false,
		validate: { isEmail: true },
	})
	declare email: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare phone: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare position: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare department: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => Agency, "agencyId")
	declare agency: Agency;

	@HasMany(() => Practicum, "supervisorId")
	declare practicums: Practicum[];
}

@Table({
	tableName: "practicums",
	timestamps: true,
	modelName: "Practicum",
})
export class Practicum extends Model {
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

	// Associations
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

// ================================
// ATTENDANCE MODELS
// ================================

@Table({
	tableName: "attendance_records",
	timestamps: true,
	modelName: "AttendanceRecord",
})
export class AttendanceRecord extends Model {
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

	// Associations
	@BelongsTo(() => User, "studentId")
	declare student: User;

	@BelongsTo(() => Practicum, "practicumId")
	declare practicum: Practicum;

	@HasOne(() => DetailedAttendanceLog, "attendanceRecordId")
	declare detailedLog: DetailedAttendanceLog;
}

@Table({
	tableName: "detailed_attendance_logs",
	timestamps: true,
	modelName: "DetailedAttendanceLog",
})
export class DetailedAttendanceLog extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => AttendanceRecord)
	@Column({ type: DataType.UUID, allowNull: false })
	declare attendanceRecordId: string;

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

	// Associations
	@BelongsTo(() => AttendanceRecord, "attendanceRecordId")
	declare attendanceRecord: AttendanceRecord;

	@BelongsTo(() => User, "approvedBy")
	declare approver: User;
}

// ================================
// REPORTS MODELS
// ================================

@Table({
	tableName: "report_templates",
	timestamps: true,
	modelName: "ReportTemplate",
})
export class ReportTemplate extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare description: string;

	@Column({
		type: DataType.ENUM("weekly", "monthly", "final", "narrative"),
		allowNull: false,
	})
	declare type: "weekly" | "monthly" | "final" | "narrative";

	@Column({ type: DataType.TEXT, allowNull: false })
	declare content: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare fields: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare createdBy: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => User, "createdBy")
	declare creator: User;

	@HasMany(() => Report, "templateId")
	declare reports: Report[];
}

@Table({
	tableName: "reports",
	timestamps: true,
	modelName: "Report",
})
export class Report extends Model {
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

	@ForeignKey(() => ReportTemplate)
	@Column({ type: DataType.UUID, allowNull: true })
	declare templateId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare content: string;

	@Column({
		type: DataType.ENUM("weekly", "monthly", "final", "narrative"),
		allowNull: false,
	})
	declare type: "weekly" | "monthly" | "final" | "narrative";

	@Column({ type: DataType.INTEGER, allowNull: true })
	declare weekNumber: number;

	@Column({
		type: DataType.ENUM("draft", "submitted", "approved", "rejected"),
		allowNull: false,
		defaultValue: "draft",
	})
	declare status: "draft" | "submitted" | "approved" | "rejected";

	@Column({ type: DataType.DATE, allowNull: true })
	declare dueDate: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare submittedDate: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare approvedDate: Date;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: true })
	declare approvedBy: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare feedback: string;

	@Column({
		type: DataType.INTEGER,
		allowNull: true,
		validate: { min: 1, max: 5 },
	})
	declare rating: number;

	@Column({ type: DataType.FLOAT, allowNull: true })
	declare hoursLogged: number;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare activities: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare learnings: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare challenges: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare fileUrl: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => User, "studentId")
	declare student: User;

	@BelongsTo(() => Practicum, "practicumId")
	declare practicum: Practicum;

	@BelongsTo(() => ReportTemplate, "templateId")
	declare template: ReportTemplate;

	@BelongsTo(() => User, "approvedBy")
	declare approver: User;
}

// ================================
// REQUIREMENTS MODELS
// ================================

@Table({
	tableName: "requirement_templates",
	timestamps: true,
	modelName: "RequirementTemplate",
})
export class RequirementTemplate extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare description: string;

	@Column({
		type: DataType.ENUM(
			"health",
			"reports",
			"training",
			"academic",
			"evaluation",
			"legal"
		),
		allowNull: false,
	})
	declare category:
		| "health"
		| "reports"
		| "training"
		| "academic"
		| "evaluation"
		| "legal";

	@Column({
		type: DataType.ENUM("urgent", "high", "medium", "low"),
		allowNull: false,
		defaultValue: "medium",
	})
	declare priority: "urgent" | "high" | "medium" | "low";

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isRequired: boolean;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare instructions: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare allowedFileTypes: string;

	@Column({ type: DataType.INTEGER, allowNull: true })
	declare maxFileSize: number;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare createdBy: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => User, "createdBy")
	declare creator: User;

	@HasMany(() => Requirement, "templateId")
	declare requirements: Requirement[];
}

@Table({
	tableName: "requirements",
	timestamps: true,
	modelName: "Requirement",
})
export class Requirement extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare studentId: string;

	@ForeignKey(() => RequirementTemplate)
	@Column({ type: DataType.UUID, allowNull: true })
	declare templateId: string;

	@ForeignKey(() => Practicum)
	@Column({ type: DataType.UUID, allowNull: true })
	declare practicumId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare description: string;

	@Column({
		type: DataType.ENUM(
			"health",
			"reports",
			"training",
			"academic",
			"evaluation",
			"legal"
		),
		allowNull: false,
	})
	declare category:
		| "health"
		| "reports"
		| "training"
		| "academic"
		| "evaluation"
		| "legal";

	@Column({
		type: DataType.ENUM(
			"pending",
			"submitted",
			"approved",
			"rejected",
			"in-progress"
		),
		allowNull: false,
		defaultValue: "pending",
	})
	declare status:
		| "pending"
		| "submitted"
		| "approved"
		| "rejected"
		| "in-progress";

	@Column({
		type: DataType.ENUM("urgent", "high", "medium", "low"),
		allowNull: false,
		defaultValue: "medium",
	})
	declare priority: "urgent" | "high" | "medium" | "low";

	@Column({ type: DataType.DATE, allowNull: true })
	declare dueDate: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare submittedDate: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare approvedDate: Date;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: true })
	declare approvedBy: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare feedback: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare fileUrl: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare fileName: string;

	@Column({ type: DataType.INTEGER, allowNull: true })
	declare fileSize: number;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => User, "studentId")
	declare student: User;

	@BelongsTo(() => RequirementTemplate, "templateId")
	declare template: RequirementTemplate;

	@BelongsTo(() => Practicum, "practicumId")
	declare practicum: Practicum;

	@BelongsTo(() => User, "approvedBy")
	declare approver: User;

	@HasMany(() => RequirementComment, "requirementId")
	declare comments: RequirementComment[];
}

@Table({
	tableName: "requirement_comments",
	timestamps: true,
	modelName: "RequirementComment",
})
export class RequirementComment extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => Requirement)
	@Column({ type: DataType.UUID, allowNull: false })
	declare requirementId: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare userId: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare content: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: false })
	declare isPrivate: boolean;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => Requirement, "requirementId")
	declare requirement: Requirement;

	@BelongsTo(() => User, "userId")
	declare user: User;
}

// ================================
// ANNOUNCEMENTS MODELS
// ================================

@Table({
	tableName: "announcements",
	timestamps: true,
	modelName: "Announcement",
})
export class Announcement extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare content: string;

	@Column({
		type: DataType.ENUM("Low", "Medium", "High"),
		allowNull: false,
		defaultValue: "Medium",
	})
	declare priority: "Low" | "Medium" | "High";

	@Column({
		type: DataType.ENUM("Draft", "Published", "Archived"),
		allowNull: false,
		defaultValue: "Draft",
	})
	declare status: "Draft" | "Published" | "Archived";

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare authorId: string;

	@Column({ type: DataType.DATE, allowNull: true })
	declare expiryDate: Date;

	@Column({ type: DataType.BOOLEAN, defaultValue: false })
	declare isPinned: boolean;

	@Column({ type: DataType.INTEGER, defaultValue: 0 })
	declare views: number;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => User, "authorId")
	declare author: User;

	@HasMany(() => AnnouncementTarget, "announcementId")
	declare targets: AnnouncementTarget[];

	@HasMany(() => AnnouncementComment, "announcementId")
	declare comments: AnnouncementComment[];
}

@Table({
	tableName: "announcement_targets",
	timestamps: false,
	modelName: "AnnouncementTarget",
	updatedAt: false,
})
export class AnnouncementTarget extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => Announcement)
	@Column({ type: DataType.UUID, allowNull: false })
	declare announcementId: string;

	@Column({
		type: DataType.ENUM("section", "course", "department", "all"),
		allowNull: false,
	})
	declare targetType: "section" | "course" | "department" | "all";

	@Column({ type: DataType.UUID, allowNull: true })
	declare targetId: string;

	@CreatedAt
	declare createdAt: Date;

	// Associations
	@BelongsTo(() => Announcement, "announcementId")
	declare announcement: Announcement;
}

@Table({
	tableName: "announcement_comments",
	timestamps: true,
	modelName: "AnnouncementComment",
})
export class AnnouncementComment extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => Announcement)
	@Column({ type: DataType.UUID, allowNull: false })
	declare announcementId: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare userId: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare content: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => Announcement, "announcementId")
	declare announcement: Announcement;

	@BelongsTo(() => User, "userId")
	declare user: User;
}

// ================================
// AUDIT MODELS
// ================================

@Table({
	tableName: "audit_logs",
	timestamps: false,
	modelName: "AuditLog",
	updatedAt: false,
})
export class AuditLog extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: true })
	declare userId: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare sessionId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare action: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare resource: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare resourceId: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare details: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare ipAddress: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare userAgent: string;

	@Column({
		type: DataType.ENUM("low", "medium", "high"),
		allowNull: false,
		defaultValue: "low",
	})
	declare severity: "low" | "medium" | "high";

	@Column({
		type: DataType.ENUM(
			"security",
			"academic",
			"submission",
			"attendance",
			"user_management",
			"system"
		),
		allowNull: false,
	})
	declare category:
		| "security"
		| "academic"
		| "submission"
		| "attendance"
		| "user_management"
		| "system";

	@Column({
		type: DataType.ENUM("success", "failed", "warning"),
		allowNull: false,
	})
	declare status: "success" | "failed" | "warning";

	@Column({ type: DataType.STRING, allowNull: true })
	declare country: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare region: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare city: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare metadata: string;

	@CreatedAt
	declare createdAt: Date;

	// Associations
	@BelongsTo(() => User, "userId")
	declare user: User;
}

// ================================
// ACHIEVEMENTS MODELS
// ================================

@Table({
	tableName: "achievement_templates",
	timestamps: true,
	modelName: "AchievementTemplate",
})
export class AchievementTemplate extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare description: string;

	@Column({
		type: DataType.ENUM(
			"attendance",
			"academic",
			"training",
			"performance",
			"milestone"
		),
		allowNull: false,
	})
	declare type:
		| "attendance"
		| "academic"
		| "training"
		| "performance"
		| "milestone";

	@Column({ type: DataType.STRING, allowNull: true })
	declare badge: string;

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
	declare points: number;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare criteria: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare createdBy: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => User, "createdBy")
	declare creator: User;

	@HasMany(() => Achievement, "templateId")
	declare achievements: Achievement[];
}

@Table({
	tableName: "achievements",
	timestamps: false,
	modelName: "Achievement",
	updatedAt: false,
})
export class Achievement extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare studentId: string;

	@ForeignKey(() => AchievementTemplate)
	@Column({ type: DataType.UUID, allowNull: true })
	declare templateId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare description: string;

	@Column({
		type: DataType.ENUM(
			"attendance",
			"academic",
			"training",
			"performance",
			"milestone"
		),
		allowNull: false,
	})
	declare type:
		| "attendance"
		| "academic"
		| "training"
		| "performance"
		| "milestone";

	@Column({ type: DataType.STRING, allowNull: true })
	declare badge: string;

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
	declare points: number;

	@Column({ type: DataType.DATE, allowNull: false })
	declare awardedDate: Date;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: true })
	declare awardedBy: string;

	@CreatedAt
	declare createdAt: Date;

	// Associations
	@BelongsTo(() => User, "studentId")
	declare student: User;

	@BelongsTo(() => AchievementTemplate, "templateId")
	declare template: AchievementTemplate;

	@BelongsTo(() => User, "awardedBy")
	declare awarder: User;
}

// ================================
// FILE ATTACHMENTS MODEL
// ================================

@Table({
	tableName: "file_attachments",
	timestamps: false,
	modelName: "FileAttachment",
	updatedAt: false,
})
export class FileAttachment extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare fileName: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare originalName: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare mimeType: string;

	@Column({ type: DataType.INTEGER, allowNull: false })
	declare size: number;

	@Column({ type: DataType.STRING, allowNull: false })
	declare path: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare url: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare uploadedBy: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare entityType: string;

	@Column({ type: DataType.UUID, allowNull: false })
	declare entityId: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: false })
	declare isPublic: boolean;

	@CreatedAt
	declare createdAt: Date;

	// Associations
	@BelongsTo(() => User, "uploadedBy")
	declare uploader: User;
}

// ================================
// EXPORT ALL MODELS
// ================================

export const models = [
	User,
	Department,
	Course,
	Section,
	StudentEnrollment,
	Agency,
	AgencyRequirement,
	Supervisor,
	Practicum,
	AttendanceRecord,
	DetailedAttendanceLog,
	ReportTemplate,
	Report,
	RequirementTemplate,
	Requirement,
	RequirementComment,
	Announcement,
	AnnouncementTarget,
	AnnouncementComment,
	AuditLog,
	AchievementTemplate,
	Achievement,
	FileAttachment,
];
