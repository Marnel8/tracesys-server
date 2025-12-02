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
const section_1 = __importDefault(require("./section.js"));
let StudentEnrollment = class StudentEnrollment extends sequelize_typescript_1.Model {
};
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], StudentEnrollment.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => user_1.default),
    (0, sequelize_typescript_1.Index)({ name: "idx_student_enrollments_studentId" }),
    (0, sequelize_typescript_1.Index)({ name: "uniq_student_enrollments_student_section", unique: true }),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], StudentEnrollment.prototype, "studentId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => section_1.default),
    (0, sequelize_typescript_1.Index)({ name: "idx_student_enrollments_sectionId" }),
    (0, sequelize_typescript_1.Index)({ name: "uniq_student_enrollments_student_section", unique: true }),
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
    (0, sequelize_typescript_1.BelongsTo)(() => user_1.default, { foreignKey: "studentId", onDelete: "CASCADE", onUpdate: "CASCADE" }),
    __metadata("design:type", user_1.default)
], StudentEnrollment.prototype, "student", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => section_1.default, { foreignKey: "sectionId", onDelete: "CASCADE", onUpdate: "CASCADE" }),
    __metadata("design:type", section_1.default)
], StudentEnrollment.prototype, "section", void 0);
StudentEnrollment = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "student_enrollments",
        timestamps: true,
        modelName: "StudentEnrollment",
    })
], StudentEnrollment);
exports.default = StudentEnrollment;
