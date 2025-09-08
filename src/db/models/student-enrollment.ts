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
import User from "./user";
import Section from "./section";

@Table({
	tableName: "student_enrollments",
	timestamps: true,
	modelName: "StudentEnrollment",
})
export default class StudentEnrollment extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare studentId: string;

	@ForeignKey(() => Section)
	@Column({ type: DataType.UUID, allowNull: false })
	declare sectionId: string;

	@Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
	declare enrollmentDate: Date;

	@Column({
		type: DataType.ENUM("enrolled", "dropped", "completed"),
		allowNull: false,
		defaultValue: "enrolled",
	})
	declare status: "enrolled" | "dropped" | "completed";

	@Column({ type: DataType.STRING, allowNull: true })
	declare finalGrade: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => User, "studentId")
	declare student: User;

	@BelongsTo(() => Section, "sectionId")
	declare section: Section;
}


