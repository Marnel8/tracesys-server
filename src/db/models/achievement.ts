import {
	Table,
	Column,
	Model,
	DataType,
	CreatedAt,
	ForeignKey,
	BelongsTo,
} from "sequelize-typescript";
import User from "./user";
import AchievementTemplate from "./achievement-template";

@Table({
	tableName: "achievements",
	timestamps: false,
	modelName: "Achievement",
	updatedAt: false,
})
export default class Achievement extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare studentId: string;

	@ForeignKey(() => AchievementTemplate)
	@Column({ type: DataType.UUID, allowNull: true })
	declare templateId: string;

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

	@Column({ type: DataType.DATE, allowNull: false })
	declare awardedDate: Date;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: true })
	declare awardedBy: string;

	@CreatedAt
	declare createdAt: Date;

	@BelongsTo(() => User, "studentId")
	declare student: User;

	@BelongsTo(() => AchievementTemplate, "templateId")
	declare template: AchievementTemplate;

	@BelongsTo(() => User, "awardedBy")
	declare awarder: User;
}


