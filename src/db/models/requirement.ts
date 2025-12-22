import {
	Table,
	Column,
	Model,
	DataType,
	CreatedAt,
	UpdatedAt,
	ForeignKey,
	BelongsTo,
	HasMany,
} from "sequelize-typescript";
import User from "./user";
import RequirementTemplate from "./requirement-template";
import RequirementComment from "./requirement-comment";
import Practicum from "./practicum";

@Table({
	tableName: "requirements",
	timestamps: true,
	modelName: "Requirement",
})
export default class Requirement extends Model {
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

	// Owning instructor for this requirement (who assigned/owns it)
	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: true })
	declare instructorId: string;

	@ForeignKey(() => Practicum)
	@Column({ type: DataType.UUID, allowNull: true })
	declare practicumId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare description: string;

	@Column({
		type: DataType.ENUM("health", "reports", "training", "academic", "evaluation", "legal"),
		allowNull: false,
	})
	declare category: "health" | "reports" | "training" | "academic" | "evaluation" | "legal";

	@Column({
		type: DataType.ENUM("pending", "submitted", "approved", "rejected", "in-progress"),
		allowNull: false,
		defaultValue: "pending",
	})
	declare status: "pending" | "submitted" | "approved" | "rejected" | "in-progress";

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

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => User, "studentId")
	declare student: User;

	@BelongsTo(() => RequirementTemplate, "templateId")
	declare template: RequirementTemplate;

	@BelongsTo(() => Practicum, "practicumId")
	declare practicum: Practicum;

	@BelongsTo(() => User, "instructorId")
	declare instructor: User;

	@BelongsTo(() => User, "approvedBy")
	declare approver: User;

	@HasMany(() => RequirementComment, "requirementId")
	declare comments: RequirementComment[];
}


