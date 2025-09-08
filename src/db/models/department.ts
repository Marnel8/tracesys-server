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
import Course from "./course";

@Table({
	tableName: "departments",
	timestamps: true,
	modelName: "Department",
})
export default class Department extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare name: string;

	@Column({ type: DataType.STRING, allowNull: false, unique: true })
	declare code: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare description: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: true })
	declare headId: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => User, "headId")
	declare head: User;

	@HasMany(() => Course, "departmentId")
	declare courses: Course[];
}


