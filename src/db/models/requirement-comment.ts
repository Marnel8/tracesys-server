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
import Requirement from "./requirement";
import User from "./user";

@Table({
	tableName: "requirement_comments",
	timestamps: true,
	modelName: "RequirementComment",
})
export default class RequirementComment extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => Requirement)
	@Column({ type: DataType.UUID, allowNull: false })
	declare requirementId: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare userId: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare content: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: false })
	declare isPrivate: boolean;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => Requirement, "requirementId")
	declare requirement: Requirement;

	@BelongsTo(() => User, "userId")
	declare user: User;
}


