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
const agency_1 = __importDefault(require("./agency.js"));
const practicum_1 = __importDefault(require("./practicum.js"));
const user_1 = __importDefault(require("./user.js"));
let Supervisor = class Supervisor extends sequelize_typescript_1.Model {
};
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], Supervisor.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => agency_1.default),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Supervisor.prototype, "agencyId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false }),
    __metadata("design:type", String)
], Supervisor.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: false, validate: { isEmail: true } }),
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
    (0, sequelize_typescript_1.ForeignKey)(() => user_1.default),
    (0, sequelize_typescript_1.Index)({ name: "idx_supervisors_createdByInstructorId" }),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", Object)
], Supervisor.prototype, "createdByInstructorId", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Supervisor.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Supervisor.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => agency_1.default, "agencyId"),
    __metadata("design:type", agency_1.default)
], Supervisor.prototype, "agency", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => user_1.default, { foreignKey: "createdByInstructorId", onDelete: "SET NULL", onUpdate: "CASCADE" }),
    __metadata("design:type", user_1.default)
], Supervisor.prototype, "createdByInstructor", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => practicum_1.default, "supervisorId"),
    __metadata("design:type", Array)
], Supervisor.prototype, "practicums", void 0);
Supervisor = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "supervisors",
        timestamps: true,
        modelName: "Supervisor",
    })
], Supervisor);
exports.default = Supervisor;
