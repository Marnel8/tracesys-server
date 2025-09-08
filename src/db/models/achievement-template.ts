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
import Achievement from "./achievement";

@Table({
	tableName: "achievement_templates",
	timestamps: true,
	modelName: "AchievementTemplate",
})
export default class AchievementTemplate extends Model {
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
		type: DataType.ENUM("attendance", "academic", "training", "performance", "milestone"),
		allowNull: false,
	})
	declare type: "attendance" | "academic" | "training" | "performance" | "milestone";

	@Column({ type: DataType.STRING, allowNull: true })
	declare badge: string;

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
	declare points: number;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare criteria: string;

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

	@HasMany(() => Achievement, "templateId")
	declare achievements: Achievement[];
}


