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
import Department from "./department";
import Section from "./section";
import Practicum from "./practicum";

@Table({
	tableName: "courses",
	timestamps: true,
	modelName: "Course",
})
export default class Course extends Model {
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

	@Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 3 })
	declare credits: number;

	@ForeignKey(() => Department)
	@Column({ type: DataType.UUID, allowNull: false })
	declare departmentId: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@Column({ type: DataType.STRING, allowNull: true })
	declare prerequisites: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare objectives: string;

	@Column({ type: DataType.INTEGER, allowNull: true })
	declare totalHours: number;

	@Column({ type: DataType.STRING, allowNull: true })
	declare level: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => Department, "departmentId")
	declare department: Department;

	@HasMany(() => Section, "courseId")
	declare sections: Section[];

	@HasMany(() => Practicum, "courseId")
	declare practicums: Practicum[];
}


