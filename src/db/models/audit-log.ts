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

@Table({
	tableName: "audit_logs",
	timestamps: false,
	modelName: "AuditLog",
	updatedAt: false,
})
export default class AuditLog extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: true })
	declare userId: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare sessionId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare action: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare resource: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare resourceId: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare details: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare ipAddress: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare userAgent: string;

	@Column({
		type: DataType.ENUM("low", "medium", "high"),
		allowNull: false,
		defaultValue: "low",
	})
	declare severity: "low" | "medium" | "high";

	@Column({
		type: DataType.ENUM(
			"security",
			"academic",
			"submission",
			"attendance",
			"user_management",
			"system"
		),
		allowNull: false,
	})
	declare category:
		| "security"
		| "academic"
		| "submission"
		| "attendance"
		| "user_management"
		| "system";

	@Column({
		type: DataType.ENUM("success", "failed", "warning"),
		allowNull: false,
	})
	declare status: "success" | "failed" | "warning";

	@Column({ type: DataType.STRING, allowNull: true })
	declare country: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare region: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare city: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare metadata: string;

	@CreatedAt
	declare createdAt: Date;

	@BelongsTo(() => User, "userId")
	declare user: User;
}


