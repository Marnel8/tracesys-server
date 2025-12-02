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
const department_1 = __importDefault(require("./department.js"));
const section_1 = __importDefault(require("./section.js"));
let Invitation = class Invitation extends sequelize_typescript_1.Model {
    // Helper methods
    isExpired() {
        return new Date() > this.expiresAt;
    }
    isUsed() {
        return this.usedAt !== null;
    }
    isValid() {
        return !this.isExpired() && !this.isUsed();
    }
};
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.UUID,
        primaryKey: true,
        defaultValue: sequelize_typescript_1.DataType.UUIDV4,
    }),
    __metadata("design:type", String)
], Invitation.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Unique)("invitations_token_unique"),
    (0, sequelize_typescript_1.Index)({ name: "idx_invitations_token" }),
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING,
        allowNull: false,
    }),
    __metadata("design:type", String)
], Invitation.prototype, "token", void 0);
__decorate([
    (0, sequelize_typescript_1.Index)({ name: "idx_invitations_email" }),
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.STRING,
        allowNull: false,
        validate: { isEmail: true },
    }),
    __metadata("design:type", String)
], Invitation.prototype, "email", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.ENUM("student", "instructor"),
        allowNull: false,
    }),
    __metadata("design:type", String)
], Invitation.prototype, "role", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => department_1.default),
    (0, sequelize_typescript_1.Index)({ name: "idx_invitations_departmentId" }),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Invitation.prototype, "departmentId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => section_1.default),
    (0, sequelize_typescript_1.Index)({ name: "idx_invitations_sectionId" }),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: true }),
    __metadata("design:type", String)
], Invitation.prototype, "sectionId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.STRING, allowNull: true }),
    __metadata("design:type", String)
], Invitation.prototype, "program", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: false }),
    __metadata("design:type", Date)
], Invitation.prototype, "expiresAt", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.DATE, allowNull: true }),
    __metadata("design:type", Date)
], Invitation.prototype, "usedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => user_1.default),
    (0, sequelize_typescript_1.Index)({ name: "idx_invitations_createdBy" }),
    (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.UUID, allowNull: false }),
    __metadata("design:type", String)
], Invitation.prototype, "createdBy", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Invitation.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Invitation.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => user_1.default, { foreignKey: "createdBy", onDelete: "CASCADE", onUpdate: "CASCADE" }),
    __metadata("design:type", user_1.default)
], Invitation.prototype, "creator", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => department_1.default, { foreignKey: "departmentId", onDelete: "SET NULL", onUpdate: "CASCADE" }),
    __metadata("design:type", department_1.default)
], Invitation.prototype, "department", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => section_1.default, { foreignKey: "sectionId", onDelete: "SET NULL", onUpdate: "CASCADE" }),
    __metadata("design:type", section_1.default)
], Invitation.prototype, "section", void 0);
Invitation = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: "invitations",
        timestamps: true,
        modelName: "Invitation",
    })
], Invitation);
exports.default = Invitation;
