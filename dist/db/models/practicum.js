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
const sequelize_typescript_1 = require("sequelize-typescript");
const user_1 = __importDefault(require("./user.js"));
const agency_1 = __importDefault(require("./agency.js"));
const supervisor_1 = __importDefault(require("./supervisor.js"));
const section_1 = __importDefault(require("./section.js"));
const course_1 = __importDefault(require("./course.js"));
const department_1 = __importDefault(require("./department.js"));
const attendance_record_1 = __importDefault(require("./attendance-record.js"));
const report_1 = __importDefault(require("./report.js"));
const requirement_1 = __importDefault(require("./requirement.js"));
let Practicum = class Practicum extends sequelize_typescript_1.Model {
};
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], Practicum.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => user_1.default),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Practicum.prototype, "studentId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => agency_1.default),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Practicum.prototype, "agencyId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => supervisor_1.default),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", Object)
], Practicum.prototype, "supervisorId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => section_1.default),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Practicum.prototype, "sectionId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => course_1.default),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Practicum.prototype, "courseId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => department_1.default),
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
    (0, sequelize_typescript_1.BelongsTo)(() => user_1.default, "studentId"),
    __metadata("design:type", user_1.default)
], Practicum.prototype, "student", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => agency_1.default, "agencyId"),
    __metadata("design:type", agency_1.default)
], Practicum.prototype, "agency", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => supervisor_1.default, "supervisorId"),
    __metadata("design:type", supervisor_1.default)
], Practicum.prototype, "supervisor", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => section_1.default, "sectionId"),
    __metadata("design:type", section_1.default)
], Practicum.prototype, "section", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => course_1.default, "courseId"),
    __metadata("design:type", course_1.default)
], Practicum.prototype, "course", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => department_1.default, "departmentId"),
    __metadata("design:type", department_1.default)
], Practicum.prototype, "department", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => attendance_record_1.default, "practicumId"),
    __metadata("design:type", Array)
], Practicum.prototype, "attendanceRecords", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => report_1.default, "practicumId"),
    __metadata("design:type", Array)
], Practicum.prototype, "reports", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => requirement_1.default, "practicumId"),
    __metadata("design:type", Array)
], Practicum.prototype, "requirements", void 0);
Practicum = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "practicums",
        timestamps: true,
        modelName: "Practicum",
    })
], Practicum);
exports.default = Practicum;
