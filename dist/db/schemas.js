"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.models = exports.FileAttachment = exports.Achievement = exports.AchievementTemplate = exports.AuditLog = exports.AnnouncementComment = exports.AnnouncementTarget = exports.Announcement = exports.RequirementComment = exports.Requirement = exports.RequirementTemplate = exports.Report = exports.ReportTemplate = exports.DetailedAttendanceLog = exports.AttendanceRecord = exports.Practicum = exports.Supervisor = exports.AgencyRequirement = exports.Agency = exports.StudentEnrollment = exports.Section = exports.Course = exports.Department = exports.User = exports.Gender = exports.UserRole = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sequelize_typescript_1 = require("sequelize-typescript");
// ================================
// ENUMS AND TYPES
// ================================
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["INSTRUCTOR"] = "instructor";
    UserRole["STUDENT"] = "student";
    UserRole["USER"] = "user";
    UserRole["MECHANIC"] = "mechanic";
})(UserRole || (exports.UserRole = UserRole = {}));
var Gender;
(function (Gender) {
    Gender["MALE"] = "male";
    Gender["FEMALE"] = "female";
    Gender["OTHER"] = "other";
})(Gender || (exports.Gender = Gender = {}));
// ================================
// USER MANAGEMENT MODEL
// ================================
let User = class User extends sequelize_typescript_1.Model {
    // Instance methods from your existing model
    SignAccessToken() {
        return jsonwebtoken_1.default.sign({ id: this.id }, process.env.ACCESS_TOKEN_SECRET || "", {
            expiresIn: "1h",
        });
    }
    SignRefreshToken() {
        return jsonwebtoken_1.default.sign({ id: this.id }, process.env.REFRESH_TOKEN_SECRET || "", {
            expiresIn: "3d",
        });
    }
    async comparePassword(enteredPassword) {
        return await bcryptjs_1.default.compare(enteredPassword, this.password);
    }
    static async hashPassword(instance) {
        if (instance.password) {
            instance.password = await bcryptjs_1.default.hash(instance.password, 10);
        }
    }
    static async hashPasswordOnUpdate(instance) {
        if (instance.password) {
            instance.password = await bcryptjs_1.default.hash(instance.password, 10);
        }
    }
};
exports.User = User;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], User.prototype, "middleName", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
    }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], User.prototype, "age", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("admin", "instructor", "student", "user", "mechanic"),
        allowNull: false,
        defaultValue: UserRole.STUDENT,
    }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("male", "female", "other"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], User.prototype, "gender", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], User.prototype, "avatar", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], User.prototype, "address", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], User.prototype, "bio", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING,
        allowNull: true,
        unique: true,
    }),
    __metadata("design:type", String)
], User.prototype, "studentId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING,
        allowNull: true,
        unique: true,
    }),
    __metadata("design:type", String)
], User.prototype, "instructorId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Department),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], User.prototype, "departmentId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], User.prototype, "yearLevel", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], User.prototype, "program", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], User.prototype, "specialization", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], User.prototype, "enrollmentDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], User.prototype, "graduationDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.BOOLEAN,
        defaultValue: true,
    }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.BOOLEAN,
        defaultValue: false,
    }),
    __metadata("design:type", Boolean)
], User.prototype, "emailVerified", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], User.prototype, "lastLoginAt", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.BOOLEAN,
        defaultValue: false,
    }),
    __metadata("design:type", Boolean)
], User.prototype, "allowLoginWithoutRequirements", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Department, "departmentId"),
    __metadata("design:type", Department)
], User.prototype, "department", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Department, "headId"),
    __metadata("design:type", Array)
], User.prototype, "departmentsHeaded", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Section, "instructorId"),
    __metadata("design:type", Array)
], User.prototype, "sectionsInstructed", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => StudentEnrollment, "studentId"),
    __metadata("design:type", Array)
], User.prototype, "enrollments", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Practicum, "studentId"),
    __metadata("design:type", Array)
], User.prototype, "practicums", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => AttendanceRecord, "studentId"),
    __metadata("design:type", Array)
], User.prototype, "attendanceRecords", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Report, "studentId"),
    __metadata("design:type", Array)
], User.prototype, "reports", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Report, "approvedBy"),
    __metadata("design:type", Array)
], User.prototype, "approvedReports", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Requirement, "studentId"),
    __metadata("design:type", Array)
], User.prototype, "requirements", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Requirement, "approvedBy"),
    __metadata("design:type", Array)
], User.prototype, "approvedRequirements", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Announcement, "authorId"),
    __metadata("design:type", Array)
], User.prototype, "announcements", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => AuditLog, "userId"),
    __metadata("design:type", Array)
], User.prototype, "auditLogs", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Achievement, "studentId"),
    __metadata("design:type", Array)
], User.prototype, "achievements", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Achievement, "awardedBy"),
    __metadata("design:type", Array)
], User.prototype, "awardedAchievements", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => AgencyRequirement, "createdBy"),
    __metadata("design:type", Array)
], User.prototype, "createdAgencyRequirements", void 0);
__decorate([
    sequelize_typescript_1.BeforeCreate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [User]),
    __metadata("design:returntype", Promise)
], User, "hashPassword", null);
__decorate([
    sequelize_typescript_1.BeforeUpdate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [User]),
    __metadata("design:returntype", Promise)
], User, "hashPasswordOnUpdate", null);
exports.User = User = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "users",
        timestamps: true,
        modelName: "User",
    })
], User);
// ================================
// ACADEMIC MODELS
// ================================
let Department = class Department extends sequelize_typescript_1.Model {
};
exports.Department = Department;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], Department.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Department.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false, unique: true }),
    __metadata("design:type", String)
], Department.prototype, "code", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], Department.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Department.prototype, "headId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.BOOLEAN, defaultValue: true }),
    __metadata("design:type", Boolean)
], Department.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Department.prototype, "color", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Department.prototype, "icon", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Department.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Department.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "headId"),
    __metadata("design:type", User)
], Department.prototype, "head", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Course, "departmentId"),
    __metadata("design:type", Array)
], Department.prototype, "courses", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Agency, "departmentId"),
    __metadata("design:type", Array)
], Department.prototype, "agencies", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => User, "departmentId"),
    __metadata("design:type", Array)
], Department.prototype, "students", void 0);
exports.Department = Department = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "departments",
        timestamps: true,
        modelName: "Department",
    })
], Department);
let Course = class Course extends sequelize_typescript_1.Model {
};
exports.Course = Course;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], Course.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Course.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false, unique: true }),
    __metadata("design:type", String)
], Course.prototype, "code", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], Course.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: false, defaultValue: 3 }),
    __metadata("design:type", Number)
], Course.prototype, "credits", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Department),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Course.prototype, "departmentId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.BOOLEAN, defaultValue: true }),
    __metadata("design:type", Boolean)
], Course.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Course.prototype, "prerequisites", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Course.prototype, "objectives", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Number)
], Course.prototype, "totalHours", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Course.prototype, "level", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Course.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Course.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Department, "departmentId"),
    __metadata("design:type", Department)
], Course.prototype, "department", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Section, "courseId"),
    __metadata("design:type", Array)
], Course.prototype, "sections", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Practicum, "courseId"),
    __metadata("design:type", Array)
], Course.prototype, "practicums", void 0);
exports.Course = Course = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "courses",
        timestamps: true,
        modelName: "Course",
    })
], Course);
let Section = class Section extends sequelize_typescript_1.Model {
};
exports.Section = Section;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], Section.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Section.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Section.prototype, "code", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Course),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Section.prototype, "courseId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Section.prototype, "instructorId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Section.prototype, "year", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Section.prototype, "semester", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Section.prototype, "academicYear", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Number)
], Section.prototype, "maxStudents", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.BOOLEAN, defaultValue: true }),
    __metadata("design:type", Boolean)
], Section.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], Section.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Section.prototype, "schedule", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Section.prototype, "room", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Section.prototype, "startDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Section.prototype, "endDate", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Section.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Section.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Course, "courseId"),
    __metadata("design:type", Course)
], Section.prototype, "course", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "instructorId"),
    __metadata("design:type", User)
], Section.prototype, "instructor", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => StudentEnrollment, "sectionId"),
    __metadata("design:type", Array)
], Section.prototype, "enrollments", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Practicum, "sectionId"),
    __metadata("design:type", Array)
], Section.prototype, "practicums", void 0);
exports.Section = Section = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "sections",
        timestamps: true,
        modelName: "Section",
    })
], Section);
let StudentEnrollment = class StudentEnrollment extends sequelize_typescript_1.Model {
};
exports.StudentEnrollment = StudentEnrollment;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], StudentEnrollment.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], StudentEnrollment.prototype, "studentId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Section),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], StudentEnrollment.prototype, "sectionId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: false, defaultValue: sequelize_typescript_1.DataType.NOW }),
    __metadata("design:type", Date)
], StudentEnrollment.prototype, "enrollmentDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("enrolled", "dropped", "completed"),
        allowNull: false,
        defaultValue: "enrolled",
    }),
    __metadata("design:type", String)
], StudentEnrollment.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], StudentEnrollment.prototype, "finalGrade", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], StudentEnrollment.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], StudentEnrollment.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "studentId"),
    __metadata("design:type", User)
], StudentEnrollment.prototype, "student", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Section, "sectionId"),
    __metadata("design:type", Section)
], StudentEnrollment.prototype, "section", void 0);
exports.StudentEnrollment = StudentEnrollment = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "student_enrollments",
        timestamps: true,
        modelName: "StudentEnrollment",
    })
], StudentEnrollment);
// ================================
// PRACTICUM MODELS
// ================================
let Agency = class Agency extends sequelize_typescript_1.Model {
};
exports.Agency = Agency;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], Agency.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Agency.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], Agency.prototype, "address", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Agency.prototype, "contactPerson", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Agency.prototype, "contactRole", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Agency.prototype, "contactPhone", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING,
        allowNull: false,
        validate: { isEmail: true },
    }),
    __metadata("design:type", String)
], Agency.prototype, "contactEmail", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Main", "Branch"),
        allowNull: false,
        defaultValue: "Main",
    }),
    __metadata("design:type", String)
], Agency.prototype, "branchType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TIME, allowNull: true }),
    __metadata("design:type", String)
], Agency.prototype, "openingTime", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TIME, allowNull: true }),
    __metadata("design:type", String)
], Agency.prototype, "closingTime", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.BOOLEAN, defaultValue: true }),
    __metadata("design:type", Boolean)
], Agency.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DECIMAL(10, 8), allowNull: true }),
    __metadata("design:type", Number)
], Agency.prototype, "latitude", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DECIMAL(11, 8), allowNull: true }),
    __metadata("design:type", Number)
], Agency.prototype, "longitude", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Department),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Agency.prototype, "departmentId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], Agency.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Agency.prototype, "website", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Agency.prototype, "industry", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Number)
], Agency.prototype, "maxStudents", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Agency.prototype, "partnershipType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Agency.prototype, "partnershipStartDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Agency.prototype, "partnershipEndDate", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Agency.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Agency.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Department, "departmentId"),
    __metadata("design:type", Department)
], Agency.prototype, "department", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Supervisor, "agencyId"),
    __metadata("design:type", Array)
], Agency.prototype, "supervisors", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Practicum, "agencyId"),
    __metadata("design:type", Array)
], Agency.prototype, "practicums", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => AgencyRequirement, "agencyId"),
    __metadata("design:type", Array)
], Agency.prototype, "requirements", void 0);
exports.Agency = Agency = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "agencies",
        timestamps: true,
        modelName: "Agency",
    })
], Agency);
let AgencyRequirement = class AgencyRequirement extends sequelize_typescript_1.Model {
};
exports.AgencyRequirement = AgencyRequirement;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], AgencyRequirement.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Agency),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], AgencyRequirement.prototype, "agencyId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], AgencyRequirement.prototype, "title", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], AgencyRequirement.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("health", "academic", "legal", "training", "other"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], AgencyRequirement.prototype, "category", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("required", "optional", "recommended"),
        allowNull: false,
        defaultValue: "required",
    }),
    __metadata("design:type", String)
], AgencyRequirement.prototype, "type", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.BOOLEAN, defaultValue: true }),
    __metadata("design:type", Boolean)
], AgencyRequirement.prototype, "isActive", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], AgencyRequirement.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], AgencyRequirement.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Agency, "agencyId"),
    __metadata("design:type", Agency)
], AgencyRequirement.prototype, "agency", void 0);
exports.AgencyRequirement = AgencyRequirement = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "agency_requirements",
        timestamps: true,
        modelName: "AgencyRequirement",
    })
], AgencyRequirement);
let Supervisor = class Supervisor extends sequelize_typescript_1.Model {
};
exports.Supervisor = Supervisor;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], Supervisor.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Agency),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Supervisor.prototype, "agencyId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Supervisor.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING,
        allowNull: false,
        validate: { isEmail: true },
    }),
    __metadata("design:type", String)
], Supervisor.prototype, "email", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Supervisor.prototype, "phone", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Supervisor.prototype, "position", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Supervisor.prototype, "department", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.BOOLEAN, defaultValue: true }),
    __metadata("design:type", Boolean)
], Supervisor.prototype, "isActive", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Supervisor.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Supervisor.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Agency, "agencyId"),
    __metadata("design:type", Agency)
], Supervisor.prototype, "agency", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Practicum, "supervisorId"),
    __metadata("design:type", Array)
], Supervisor.prototype, "practicums", void 0);
exports.Supervisor = Supervisor = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "supervisors",
        timestamps: true,
        modelName: "Supervisor",
    })
], Supervisor);
let Practicum = class Practicum extends sequelize_typescript_1.Model {
};
exports.Practicum = Practicum;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], Practicum.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Practicum.prototype, "studentId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Agency),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Practicum.prototype, "agencyId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Supervisor),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Practicum.prototype, "supervisorId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Section),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Practicum.prototype, "sectionId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Course),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Practicum.prototype, "courseId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Department),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Practicum.prototype, "departmentId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Practicum.prototype, "position", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: false }),
    __metadata("design:type", Date)
], Practicum.prototype, "startDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: false }),
    __metadata("design:type", Date)
], Practicum.prototype, "endDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: false, defaultValue: 400 }),
    __metadata("design:type", Number)
], Practicum.prototype, "totalHours", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: false, defaultValue: 0 }),
    __metadata("design:type", Number)
], Practicum.prototype, "completedHours", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("On-site", "Hybrid", "Work From Home"),
        allowNull: false,
        defaultValue: "On-site",
    }),
    __metadata("design:type", String)
], Practicum.prototype, "workSetup", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("active", "completed", "inactive", "suspended", "terminated"),
        allowNull: false,
        defaultValue: "active",
    }),
    __metadata("design:type", String)
], Practicum.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], Practicum.prototype, "objectives", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], Practicum.prototype, "responsibilities", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Practicum.prototype, "academicYear", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Practicum.prototype, "semester", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Practicum.prototype, "evaluationDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.FLOAT, allowNull: true }),
    __metadata("design:type", Number)
], Practicum.prototype, "finalGrade", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], Practicum.prototype, "remarks", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Practicum.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Practicum.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "studentId"),
    __metadata("design:type", User)
], Practicum.prototype, "student", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Agency, "agencyId"),
    __metadata("design:type", Agency)
], Practicum.prototype, "agency", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Supervisor, "supervisorId"),
    __metadata("design:type", Supervisor)
], Practicum.prototype, "supervisor", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Section, "sectionId"),
    __metadata("design:type", Section)
], Practicum.prototype, "section", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Course, "courseId"),
    __metadata("design:type", Course)
], Practicum.prototype, "course", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Department, "departmentId"),
    __metadata("design:type", Department)
], Practicum.prototype, "department", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => AttendanceRecord, "practicumId"),
    __metadata("design:type", Array)
], Practicum.prototype, "attendanceRecords", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Report, "practicumId"),
    __metadata("design:type", Array)
], Practicum.prototype, "reports", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Requirement, "practicumId"),
    __metadata("design:type", Array)
], Practicum.prototype, "requirements", void 0);
exports.Practicum = Practicum = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "practicums",
        timestamps: true,
        modelName: "Practicum",
    })
], Practicum);
// ================================
// ATTENDANCE MODELS
// ================================
let AttendanceRecord = class AttendanceRecord extends sequelize_typescript_1.Model {
};
exports.AttendanceRecord = AttendanceRecord;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "studentId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Practicum),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "practicumId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATEONLY, allowNull: false }),
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "date", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "day", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "timeIn", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "timeOut", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.FLOAT, allowNull: true }),
    __metadata("design:type", Number)
], AttendanceRecord.prototype, "hours", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("present", "absent", "late", "excused"),
        allowNull: false,
        defaultValue: "present",
    }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DECIMAL(10, 8), allowNull: true }),
    __metadata("design:type", Number)
], AttendanceRecord.prototype, "latitude", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DECIMAL(11, 8), allowNull: true }),
    __metadata("design:type", Number)
], AttendanceRecord.prototype, "longitude", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "address", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "selfieImage", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "remarks", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "studentId"),
    __metadata("design:type", User)
], AttendanceRecord.prototype, "student", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Practicum, "practicumId"),
    __metadata("design:type", Practicum)
], AttendanceRecord.prototype, "practicum", void 0);
__decorate([
    (0, sequelize_typescript_1.HasOne)(() => DetailedAttendanceLog, "attendanceRecordId"),
    __metadata("design:type", DetailedAttendanceLog)
], AttendanceRecord.prototype, "detailedLog", void 0);
exports.AttendanceRecord = AttendanceRecord = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "attendance_records",
        timestamps: true,
        modelName: "AttendanceRecord",
    })
], AttendanceRecord);
let DetailedAttendanceLog = class DetailedAttendanceLog extends sequelize_typescript_1.Model {
};
exports.DetailedAttendanceLog = DetailedAttendanceLog;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => AttendanceRecord),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "attendanceRecordId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "photoIn", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "photoOut", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Inside", "In-field", "Outside"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "timeInLocationType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Mobile", "Desktop", "Tablet"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "timeInDeviceType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "timeInDeviceUnit", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "timeInMacAddress", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Normal", "Late", "Early"),
        allowNull: false,
        defaultValue: "Normal",
    }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "timeInRemarks", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "timeInExactLocation", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Inside", "In-field", "Outside"),
        allowNull: true,
    }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "timeOutLocationType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Mobile", "Desktop", "Tablet"),
        allowNull: true,
    }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "timeOutDeviceType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "timeOutDeviceUnit", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "timeOutMacAddress", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Normal", "Early Departure", "Overtime"),
        allowNull: true,
    }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "timeOutRemarks", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "timeOutExactLocation", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Pending", "Approved", "Declined"),
        allowNull: false,
        defaultValue: "Pending",
    }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "approvedBy", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], DetailedAttendanceLog.prototype, "approvedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "notes", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], DetailedAttendanceLog.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], DetailedAttendanceLog.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => AttendanceRecord, "attendanceRecordId"),
    __metadata("design:type", AttendanceRecord)
], DetailedAttendanceLog.prototype, "attendanceRecord", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "approvedBy"),
    __metadata("design:type", User)
], DetailedAttendanceLog.prototype, "approver", void 0);
exports.DetailedAttendanceLog = DetailedAttendanceLog = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "detailed_attendance_logs",
        timestamps: true,
        modelName: "DetailedAttendanceLog",
    })
], DetailedAttendanceLog);
// ================================
// REPORTS MODELS
// ================================
let ReportTemplate = class ReportTemplate extends sequelize_typescript_1.Model {
};
exports.ReportTemplate = ReportTemplate;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], ReportTemplate.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], ReportTemplate.prototype, "title", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], ReportTemplate.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("weekly", "monthly", "final", "narrative"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], ReportTemplate.prototype, "type", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], ReportTemplate.prototype, "content", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], ReportTemplate.prototype, "fields", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.BOOLEAN, defaultValue: true }),
    __metadata("design:type", Boolean)
], ReportTemplate.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], ReportTemplate.prototype, "createdBy", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], ReportTemplate.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], ReportTemplate.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "createdBy"),
    __metadata("design:type", User)
], ReportTemplate.prototype, "creator", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Report, "templateId"),
    __metadata("design:type", Array)
], ReportTemplate.prototype, "reports", void 0);
exports.ReportTemplate = ReportTemplate = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "report_templates",
        timestamps: true,
        modelName: "ReportTemplate",
    })
], ReportTemplate);
let Report = class Report extends sequelize_typescript_1.Model {
};
exports.Report = Report;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], Report.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Report.prototype, "studentId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Practicum),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Report.prototype, "practicumId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => ReportTemplate),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Report.prototype, "templateId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Report.prototype, "title", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], Report.prototype, "content", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("weekly", "monthly", "final", "narrative"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], Report.prototype, "type", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Number)
], Report.prototype, "weekNumber", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Report.prototype, "startDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Report.prototype, "endDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("draft", "submitted", "approved", "rejected"),
        allowNull: false,
        defaultValue: "draft",
    }),
    __metadata("design:type", String)
], Report.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Report.prototype, "dueDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Report.prototype, "submittedDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Report.prototype, "approvedDate", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Report.prototype, "approvedBy", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], Report.prototype, "feedback", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.INTEGER,
        allowNull: true,
        validate: { min: 1, max: 5 },
    }),
    __metadata("design:type", Number)
], Report.prototype, "rating", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.FLOAT, allowNull: true }),
    __metadata("design:type", Number)
], Report.prototype, "hoursLogged", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], Report.prototype, "activities", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], Report.prototype, "learnings", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], Report.prototype, "challenges", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Report.prototype, "fileUrl", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Report.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Report.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "studentId"),
    __metadata("design:type", User)
], Report.prototype, "student", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Practicum, "practicumId"),
    __metadata("design:type", Practicum)
], Report.prototype, "practicum", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => ReportTemplate, "templateId"),
    __metadata("design:type", ReportTemplate)
], Report.prototype, "template", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "approvedBy"),
    __metadata("design:type", User)
], Report.prototype, "approver", void 0);
exports.Report = Report = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "reports",
        timestamps: true,
        modelName: "Report",
    })
], Report);
// ================================
// REQUIREMENTS MODELS
// ================================
let RequirementTemplate = class RequirementTemplate extends sequelize_typescript_1.Model {
};
exports.RequirementTemplate = RequirementTemplate;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], RequirementTemplate.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], RequirementTemplate.prototype, "title", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], RequirementTemplate.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("health", "reports", "training", "academic", "evaluation", "legal"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], RequirementTemplate.prototype, "category", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("urgent", "high", "medium", "low"),
        allowNull: false,
        defaultValue: "medium",
    }),
    __metadata("design:type", String)
], RequirementTemplate.prototype, "priority", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.BOOLEAN, defaultValue: true }),
    __metadata("design:type", Boolean)
], RequirementTemplate.prototype, "isRequired", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], RequirementTemplate.prototype, "instructions", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], RequirementTemplate.prototype, "allowedFileTypes", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Number)
], RequirementTemplate.prototype, "maxFileSize", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.BOOLEAN, defaultValue: true }),
    __metadata("design:type", Boolean)
], RequirementTemplate.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], RequirementTemplate.prototype, "createdBy", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], RequirementTemplate.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], RequirementTemplate.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "createdBy"),
    __metadata("design:type", User)
], RequirementTemplate.prototype, "creator", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Requirement, "templateId"),
    __metadata("design:type", Array)
], RequirementTemplate.prototype, "requirements", void 0);
exports.RequirementTemplate = RequirementTemplate = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "requirement_templates",
        timestamps: true,
        modelName: "RequirementTemplate",
    })
], RequirementTemplate);
let Requirement = class Requirement extends sequelize_typescript_1.Model {
};
exports.Requirement = Requirement;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], Requirement.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Requirement.prototype, "studentId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => RequirementTemplate),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Requirement.prototype, "templateId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Practicum),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Requirement.prototype, "practicumId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Requirement.prototype, "title", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], Requirement.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("health", "reports", "training", "academic", "evaluation", "legal"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], Requirement.prototype, "category", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("pending", "submitted", "approved", "rejected", "in-progress"),
        allowNull: false,
        defaultValue: "pending",
    }),
    __metadata("design:type", String)
], Requirement.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("urgent", "high", "medium", "low"),
        allowNull: false,
        defaultValue: "medium",
    }),
    __metadata("design:type", String)
], Requirement.prototype, "priority", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Requirement.prototype, "dueDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Requirement.prototype, "submittedDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Requirement.prototype, "approvedDate", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Requirement.prototype, "approvedBy", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], Requirement.prototype, "feedback", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Requirement.prototype, "fileUrl", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Requirement.prototype, "fileName", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Number)
], Requirement.prototype, "fileSize", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Requirement.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Requirement.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "studentId"),
    __metadata("design:type", User)
], Requirement.prototype, "student", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => RequirementTemplate, "templateId"),
    __metadata("design:type", RequirementTemplate)
], Requirement.prototype, "template", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Practicum, "practicumId"),
    __metadata("design:type", Practicum)
], Requirement.prototype, "practicum", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "approvedBy"),
    __metadata("design:type", User)
], Requirement.prototype, "approver", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => RequirementComment, "requirementId"),
    __metadata("design:type", Array)
], Requirement.prototype, "comments", void 0);
exports.Requirement = Requirement = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "requirements",
        timestamps: true,
        modelName: "Requirement",
    })
], Requirement);
let RequirementComment = class RequirementComment extends sequelize_typescript_1.Model {
};
exports.RequirementComment = RequirementComment;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], RequirementComment.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Requirement),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], RequirementComment.prototype, "requirementId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], RequirementComment.prototype, "userId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], RequirementComment.prototype, "content", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], RequirementComment.prototype, "isPrivate", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], RequirementComment.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], RequirementComment.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Requirement, "requirementId"),
    __metadata("design:type", Requirement)
], RequirementComment.prototype, "requirement", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "userId"),
    __metadata("design:type", User)
], RequirementComment.prototype, "user", void 0);
exports.RequirementComment = RequirementComment = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "requirement_comments",
        timestamps: true,
        modelName: "RequirementComment",
    })
], RequirementComment);
// ================================
// ANNOUNCEMENTS MODELS
// ================================
let Announcement = class Announcement extends sequelize_typescript_1.Model {
};
exports.Announcement = Announcement;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], Announcement.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Announcement.prototype, "title", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], Announcement.prototype, "content", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Low", "Medium", "High"),
        allowNull: false,
        defaultValue: "Medium",
    }),
    __metadata("design:type", String)
], Announcement.prototype, "priority", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Draft", "Published", "Archived"),
        allowNull: false,
        defaultValue: "Draft",
    }),
    __metadata("design:type", String)
], Announcement.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Announcement.prototype, "authorId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Announcement.prototype, "expiryDate", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], Announcement.prototype, "isPinned", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, defaultValue: 0 }),
    __metadata("design:type", Number)
], Announcement.prototype, "views", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Announcement.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Announcement.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "authorId"),
    __metadata("design:type", User)
], Announcement.prototype, "author", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => AnnouncementTarget, "announcementId"),
    __metadata("design:type", Array)
], Announcement.prototype, "targets", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => AnnouncementComment, "announcementId"),
    __metadata("design:type", Array)
], Announcement.prototype, "comments", void 0);
exports.Announcement = Announcement = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "announcements",
        timestamps: true,
        modelName: "Announcement",
    })
], Announcement);
let AnnouncementTarget = class AnnouncementTarget extends sequelize_typescript_1.Model {
};
exports.AnnouncementTarget = AnnouncementTarget;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], AnnouncementTarget.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Announcement),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], AnnouncementTarget.prototype, "announcementId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("section", "course", "department", "all"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], AnnouncementTarget.prototype, "targetType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], AnnouncementTarget.prototype, "targetId", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], AnnouncementTarget.prototype, "createdAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Announcement, "announcementId"),
    __metadata("design:type", Announcement)
], AnnouncementTarget.prototype, "announcement", void 0);
exports.AnnouncementTarget = AnnouncementTarget = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "announcement_targets",
        timestamps: false,
        modelName: "AnnouncementTarget",
        updatedAt: false,
    })
], AnnouncementTarget);
let AnnouncementComment = class AnnouncementComment extends sequelize_typescript_1.Model {
};
exports.AnnouncementComment = AnnouncementComment;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], AnnouncementComment.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Announcement),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], AnnouncementComment.prototype, "announcementId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], AnnouncementComment.prototype, "userId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], AnnouncementComment.prototype, "content", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], AnnouncementComment.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], AnnouncementComment.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Announcement, "announcementId"),
    __metadata("design:type", Announcement)
], AnnouncementComment.prototype, "announcement", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "userId"),
    __metadata("design:type", User)
], AnnouncementComment.prototype, "user", void 0);
exports.AnnouncementComment = AnnouncementComment = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "announcement_comments",
        timestamps: true,
        modelName: "AnnouncementComment",
    })
], AnnouncementComment);
// ================================
// AUDIT MODELS
// ================================
let AuditLog = class AuditLog extends sequelize_typescript_1.Model {
};
exports.AuditLog = AuditLog;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], AuditLog.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "userId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "sessionId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], AuditLog.prototype, "action", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], AuditLog.prototype, "resource", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "resourceId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], AuditLog.prototype, "details", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], AuditLog.prototype, "ipAddress", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], AuditLog.prototype, "userAgent", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("low", "medium", "high"),
        allowNull: false,
        defaultValue: "low",
    }),
    __metadata("design:type", String)
], AuditLog.prototype, "severity", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("security", "academic", "submission", "attendance", "user_management", "system"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], AuditLog.prototype, "category", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("success", "failed", "warning"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], AuditLog.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "country", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "region", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "city", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "metadata", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], AuditLog.prototype, "createdAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "userId"),
    __metadata("design:type", User)
], AuditLog.prototype, "user", void 0);
exports.AuditLog = AuditLog = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "audit_logs",
        timestamps: false,
        modelName: "AuditLog",
        updatedAt: false,
    })
], AuditLog);
// ================================
// ACHIEVEMENTS MODELS
// ================================
let AchievementTemplate = class AchievementTemplate extends sequelize_typescript_1.Model {
};
exports.AchievementTemplate = AchievementTemplate;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], AchievementTemplate.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], AchievementTemplate.prototype, "title", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], AchievementTemplate.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("attendance", "academic", "training", "performance", "milestone"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], AchievementTemplate.prototype, "type", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AchievementTemplate.prototype, "badge", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: false, defaultValue: 0 }),
    __metadata("design:type", Number)
], AchievementTemplate.prototype, "points", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], AchievementTemplate.prototype, "criteria", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.BOOLEAN, defaultValue: true }),
    __metadata("design:type", Boolean)
], AchievementTemplate.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], AchievementTemplate.prototype, "createdBy", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], AchievementTemplate.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], AchievementTemplate.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "createdBy"),
    __metadata("design:type", User)
], AchievementTemplate.prototype, "creator", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Achievement, "templateId"),
    __metadata("design:type", Array)
], AchievementTemplate.prototype, "achievements", void 0);
exports.AchievementTemplate = AchievementTemplate = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "achievement_templates",
        timestamps: true,
        modelName: "AchievementTemplate",
    })
], AchievementTemplate);
let Achievement = class Achievement extends sequelize_typescript_1.Model {
};
exports.Achievement = Achievement;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], Achievement.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Achievement.prototype, "studentId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => AchievementTemplate),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Achievement.prototype, "templateId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Achievement.prototype, "title", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: false }),
    __metadata("design:type", String)
], Achievement.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("attendance", "academic", "training", "performance", "milestone"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], Achievement.prototype, "type", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Achievement.prototype, "badge", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: false, defaultValue: 0 }),
    __metadata("design:type", Number)
], Achievement.prototype, "points", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: false }),
    __metadata("design:type", Date)
], Achievement.prototype, "awardedDate", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Achievement.prototype, "awardedBy", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Achievement.prototype, "createdAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "studentId"),
    __metadata("design:type", User)
], Achievement.prototype, "student", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => AchievementTemplate, "templateId"),
    __metadata("design:type", AchievementTemplate)
], Achievement.prototype, "template", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "awardedBy"),
    __metadata("design:type", User)
], Achievement.prototype, "awarder", void 0);
exports.Achievement = Achievement = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "achievements",
        timestamps: false,
        modelName: "Achievement",
        updatedAt: false,
    })
], Achievement);
// ================================
// FILE ATTACHMENTS MODEL
// ================================
let FileAttachment = class FileAttachment extends sequelize_typescript_1.Model {
};
exports.FileAttachment = FileAttachment;
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], FileAttachment.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], FileAttachment.prototype, "fileName", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], FileAttachment.prototype, "originalName", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], FileAttachment.prototype, "mimeType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: false }),
    __metadata("design:type", Number)
], FileAttachment.prototype, "size", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], FileAttachment.prototype, "path", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], FileAttachment.prototype, "url", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], FileAttachment.prototype, "uploadedBy", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], FileAttachment.prototype, "entityType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], FileAttachment.prototype, "entityId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.BOOLEAN, defaultValue: false }),
    __metadata("design:type", Boolean)
], FileAttachment.prototype, "isPublic", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], FileAttachment.prototype, "createdAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User, "uploadedBy"),
    __metadata("design:type", User)
], FileAttachment.prototype, "uploader", void 0);
exports.FileAttachment = FileAttachment = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "file_attachments",
        timestamps: false,
        modelName: "FileAttachment",
        updatedAt: false,
    })
], FileAttachment);
// ================================
// EXPORT ALL MODELS
// ================================
exports.models = [
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
