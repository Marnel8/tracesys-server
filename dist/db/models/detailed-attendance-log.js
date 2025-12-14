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
const attendance_record_1 = __importDefault(require("./attendance-record.js"));
const user_1 = __importDefault(require("./user.js"));
let DetailedAttendanceLog = class DetailedAttendanceLog extends sequelize_typescript_1.Model {
};
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => attendance_record_1.default),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "attendanceRecordId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("morning", "afternoon", "overtime"),
        allowNull: true,
    }),
    __metadata("design:type", String)
], DetailedAttendanceLog.prototype, "sessionType", void 0);
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
    (0, sequelize_typescript_1.ForeignKey)(() => user_1.default),
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
    (0, sequelize_typescript_1.BelongsTo)(() => attendance_record_1.default, "attendanceRecordId"),
    __metadata("design:type", attendance_record_1.default)
], DetailedAttendanceLog.prototype, "attendanceRecord", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => user_1.default, "approvedBy"),
    __metadata("design:type", user_1.default)
], DetailedAttendanceLog.prototype, "approver", void 0);
DetailedAttendanceLog = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "detailed_attendance_logs",
        timestamps: true,
        modelName: "DetailedAttendanceLog",
    })
], DetailedAttendanceLog);
exports.default = DetailedAttendanceLog;
