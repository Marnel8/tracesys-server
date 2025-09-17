import {
	Table,
	Column,
	Model,
	DataType,
	CreatedAt,
	UpdatedAt,
	ForeignKey,
	BelongsTo,
} from "sequelize-typescript";
import Agency from "./agency";

@Table({
	tableName: "agency_requirements",
	timestamps: true,
	modelName: "AgencyRequirement",
})
export default class AgencyRequirement extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => Agency)
	@Column({ type: DataType.UUID, allowNull: false })
	declare agencyId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare description: string;

	@Column({
		type: DataType.ENUM("health", "academic", "legal", "training", "other"),
		allowNull: false,
	})
	declare category: "health" | "academic" | "legal" | "training" | "other";

	@Column({
		type: DataType.ENUM("required", "optional", "recommended"),
		allowNull: false,
		defaultValue: "required",
	})
	declare type: "required" | "optional" | "recommended";

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => Agency, "agencyId")
	declare agency: Agency;
}
