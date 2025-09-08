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
import Report from "./report";

@Table({
	tableName: "report_templates",
	timestamps: true,
	modelName: "ReportTemplate",
})
export default class ReportTemplate extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare description: string;

	@Column({
		type: DataType.ENUM("weekly", "monthly", "final", "narrative"),
		allowNull: false,
	})
	declare type: "weekly" | "monthly" | "final" | "narrative";

	@Column({ type: DataType.TEXT, allowNull: false })
	declare content: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare fields: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare createdBy: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => User, "createdBy")
	declare creator: User;

	@HasMany(() => Report, "templateId")
	declare reports: Report[];
}


