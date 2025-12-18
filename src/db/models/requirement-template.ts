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
import Requirement from "./requirement";

@Table({
	tableName: "requirement_templates",
	timestamps: true,
	modelName: "RequirementTemplate",
})
export default class RequirementTemplate extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

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
		type: DataType.ENUM("urgent", "high", "medium", "low"),
		allowNull: false,
		defaultValue: "medium",
	})
	declare priority: "urgent" | "high" | "medium" | "low";

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isRequired: boolean;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare instructions: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare allowedFileTypes: string;

	@Column({ type: DataType.INTEGER, allowNull: true })
	declare maxFileSize: number;

	// Optional downloadable template file metadata
	@Column({ type: DataType.TEXT, allowNull: true })
	declare templateFileUrl: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare templateFileName: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare templateFileType: string;

	@Column({ type: DataType.INTEGER, allowNull: true })
	declare templateFileSize: number; // bytes

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare appliesToSchoolAffiliated: boolean;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare createdBy: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => User, "createdBy")
	declare creator: User;

	@HasMany(() => Requirement, "templateId")
	declare requirements: Requirement[];
}


