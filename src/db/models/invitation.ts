import {
	Table,
	Column,
	Model,
	DataType,
	CreatedAt,
	UpdatedAt,
	ForeignKey,
	BelongsTo,
	Index,
	Unique,
} from "sequelize-typescript";
import User from "./user";
import Department from "./department";
import Section from "./section";
import { UserRole } from "./user";

@Table({
	tableName: "invitations",
	timestamps: true,
	modelName: "Invitation",
})
export default class Invitation extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Unique("invitations_token_unique")
	@Index({ name: "idx_invitations_token" })
	@Column({
		type: DataType.STRING,
		allowNull: false,
	})
	declare token: string;

	@Index({ name: "idx_invitations_email" })
	@Column({
		type: DataType.STRING,
		allowNull: false,
		validate: { isEmail: true },
	})
	declare email: string;

	@Column({
		type: DataType.ENUM("student", "instructor"),
		allowNull: false,
	})
	declare role: "student" | "instructor";

	@ForeignKey(() => Department)
	@Index({ name: "idx_invitations_departmentId" })
	@Column({ type: DataType.UUID, allowNull: true })
	declare departmentId: string;

	@ForeignKey(() => Section)
	@Index({ name: "idx_invitations_sectionId" })
	@Column({ type: DataType.UUID, allowNull: true })
	declare sectionId: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare program: string;

	@Column({ type: DataType.DATE, allowNull: false })
	declare expiresAt: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare usedAt: Date;

	@ForeignKey(() => User)
	@Index({ name: "idx_invitations_createdBy" })
	@Column({ type: DataType.UUID, allowNull: false })
	declare createdBy: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	// Associations
	@BelongsTo(() => User, { foreignKey: "createdBy", onDelete: "CASCADE", onUpdate: "CASCADE" })
	declare creator: User;

	@BelongsTo(() => Department, { foreignKey: "departmentId", onDelete: "SET NULL", onUpdate: "CASCADE" })
	declare department: Department;

	@BelongsTo(() => Section, { foreignKey: "sectionId", onDelete: "SET NULL", onUpdate: "CASCADE" })
	declare section: Section;

	// Helper methods
	public isExpired(): boolean {
		return new Date() > this.expiresAt;
	}

	public isUsed(): boolean {
		return this.usedAt !== null;
	}

	public isValid(): boolean {
		return !this.isExpired() && !this.isUsed();
	}
}

