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
exports.Gender = exports.UserRole = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sequelize_typescript_1 = require("sequelize-typescript");
const dotenv_1 = __importDefault(require("dotenv"));
const department_1 = __importDefault(require("./department.js"));
const section_1 = __importDefault(require("./section.js"));
const student_enrollment_1 = __importDefault(require("./student-enrollment.js"));
const practicum_1 = __importDefault(require("./practicum.js"));
const attendance_record_1 = __importDefault(require("./attendance-record.js"));
const report_1 = __importDefault(require("./report.js"));
const requirement_1 = __importDefault(require("./requirement.js"));
const announcement_1 = __importDefault(require("./announcement.js"));
const audit_log_1 = __importDefault(require("./audit-log.js"));
const achievement_1 = __importDefault(require("./achievement.js"));
const file_attachment_1 = __importDefault(require("./file-attachment.js"));
dotenv_1.default.config();
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
let User = class User extends sequelize_typescript_1.Model {
    static async hashPassword(instance) {
        if (instance.password) {
            instance.password = await bcryptjs_1.default.hash(instance.password, 10);
        }
    }
    static async hashPasswordOnUpdate(instance) {
        if (instance.password && instance.password !== "" && instance.changed('password')) {
            if (!instance.password.startsWith('$2a$') && !instance.password.startsWith('$2b$')) {
                instance.password = await bcryptjs_1.default.hash(instance.password, 10);
            }
        }
    }
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
        if (!this.password) {
            return false; // OAuth users don't have passwords
        }
        return await bcryptjs_1.default.compare(enteredPassword, this.password);
    }
};
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
    (0, sequelize_typescript_1.Unique)("users_email_unique"),
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING,
        allowNull: false,
        validate: { isEmail: true },
    }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER, allowNull: true }),
    __metadata("design:type", Number)
], User.prototype, "age", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
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
        allowNull: true,
    }),
    __metadata("design:type", String)
], User.prototype, "gender", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING,
        allowNull: true,
    }),
    __metadata("design:type", String)
], User.prototype, "provider", void 0);
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
    (0, sequelize_typescript_1.Unique)("users_student_id_unique"),
    (0, sequelize_typescript_1.Index)({ name: "idx_users_studentId" }),
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING,
        allowNull: true,
    }),
    __metadata("design:type", String)
], User.prototype, "studentId", void 0);
__decorate([
    (0, sequelize_typescript_1.Unique)("users_instructor_id_unique"),
    (0, sequelize_typescript_1.Index)({ name: "idx_users_instructorId" }),
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING,
        allowNull: true,
    }),
    __metadata("design:type", String)
], User.prototype, "instructorId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => department_1.default),
    (0, sequelize_typescript_1.Index)({ name: "idx_users_departmentId" }),
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
    (0, sequelize_typescript_1.BelongsTo)(() => department_1.default, { foreignKey: "departmentId", onDelete: "SET NULL", onUpdate: "CASCADE" }),
    __metadata("design:type", department_1.default)
], User.prototype, "department", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => department_1.default, "headId"),
    __metadata("design:type", Array)
], User.prototype, "departmentsHeaded", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => section_1.default, "instructorId"),
    __metadata("design:type", Array)
], User.prototype, "sectionsInstructed", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => student_enrollment_1.default, "studentId"),
    __metadata("design:type", Array)
], User.prototype, "enrollments", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => practicum_1.default, "studentId"),
    __metadata("design:type", Array)
], User.prototype, "practicums", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => attendance_record_1.default, "studentId"),
    __metadata("design:type", Array)
], User.prototype, "attendanceRecords", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => report_1.default, "studentId"),
    __metadata("design:type", Array)
], User.prototype, "reports", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => report_1.default, "approvedBy"),
    __metadata("design:type", Array)
], User.prototype, "approvedReports", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => requirement_1.default, "studentId"),
    __metadata("design:type", Array)
], User.prototype, "requirements", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => requirement_1.default, "approvedBy"),
    __metadata("design:type", Array)
], User.prototype, "approvedRequirements", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => announcement_1.default, "authorId"),
    __metadata("design:type", Array)
], User.prototype, "announcements", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => audit_log_1.default, "userId"),
    __metadata("design:type", Array)
], User.prototype, "auditLogs", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => achievement_1.default, "studentId"),
    __metadata("design:type", Array)
], User.prototype, "achievements", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => achievement_1.default, "awardedBy"),
    __metadata("design:type", Array)
], User.prototype, "awardedAchievements", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => file_attachment_1.default, "uploadedBy"),
    __metadata("design:type", Array)
], User.prototype, "uploads", void 0);
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
User = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "users",
        timestamps: true,
        modelName: "User",
    })
], User);
exports.default = User;
