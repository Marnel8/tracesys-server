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
	Index,
} from "sequelize-typescript";
import User from "./user";
import Course from "./course";
import Agency from "./agency";

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
	@Index({ name: "idx_departments_headId" })
	@Column({ type: DataType.UUID, allowNull: true })
	declare headId: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@Column({ type: DataType.STRING, allowNull: true })
	declare color: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare icon: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => User, { foreignKey: "headId", onDelete: "SET NULL", onUpdate: "CASCADE" })
	declare head: User;

	@HasMany(() => Course, "departmentId")
	declare courses: Course[];

	@HasMany(() => Agency, "departmentId")
	declare agencies: Agency[];

	@HasMany(() => User, "departmentId")
	declare students: User[];
}


