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
const practicum_1 = __importDefault(require("./practicum.js"));
const detailed_attendance_log_1 = __importDefault(require("./detailed-attendance-log.js"));
let AttendanceRecord = class AttendanceRecord extends sequelize_typescript_1.Model {
};
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => user_1.default),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "studentId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => practicum_1.default),
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
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "morningTimeIn", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "morningTimeOut", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "afternoonTimeIn", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "afternoonTimeOut", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("morning", "afternoon", "full_day"),
        allowNull: true,
    }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "sessionType", void 0);
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
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "agencyName", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "agencyLocation", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("On-site", "Hybrid", "Work From Home"),
        allowNull: true,
    }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "workSetup", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Main", "Branch"),
        allowNull: true,
    }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "branchType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TIME, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "openingTime", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TIME, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "closingTime", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "contactPerson", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "contactRole", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "contactPhone", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true, validate: { isEmail: true } }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "contactEmail", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Inside", "In-field", "Outside"),
        allowNull: true,
    }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "timeInLocationType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Mobile", "Desktop", "Tablet"),
        allowNull: true,
    }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "timeInDeviceType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "timeInDeviceUnit", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "timeInMacAddress", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Normal", "Late", "Early"),
        allowNull: true,
        defaultValue: "Normal",
    }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "timeInRemarks", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "timeInExactLocation", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Inside", "In-field", "Outside"),
        allowNull: true,
    }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "timeOutLocationType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Mobile", "Desktop", "Tablet"),
        allowNull: true,
    }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "timeOutDeviceType", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "timeOutDeviceUnit", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "timeOutMacAddress", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Normal", "Early Departure", "Overtime"),
        allowNull: true,
    }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "timeOutRemarks", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "timeOutExactLocation", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "photoIn", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "photoOut", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("Pending", "Approved", "Declined"),
        allowNull: false,
        defaultValue: "Pending",
    }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "approvalStatus", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => user_1.default),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "approvedBy", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "approvedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.TEXT, allowNull: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "approvalNotes", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => user_1.default, "studentId"),
    __metadata("design:type", user_1.default)
], AttendanceRecord.prototype, "student", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => practicum_1.default, "practicumId"),
    __metadata("design:type", practicum_1.default)
], AttendanceRecord.prototype, "practicum", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => user_1.default, "approvedBy"),
    __metadata("design:type", user_1.default)
], AttendanceRecord.prototype, "approver", void 0);
__decorate([
    (0, sequelize_typescript_1.HasOne)(() => detailed_attendance_log_1.default, "attendanceRecordId"),
    __metadata("design:type", detailed_attendance_log_1.default)
], AttendanceRecord.prototype, "detailedLog", void 0);
AttendanceRecord = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "attendance_records",
        timestamps: true,
        modelName: "AttendanceRecord",
    })
], AttendanceRecord);
exports.default = AttendanceRecord;
