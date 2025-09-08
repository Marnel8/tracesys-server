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
import Course from "./course";
import User from "./user";
import StudentEnrollment from "./student-enrollment";

@Table({
	tableName: "sections",
	timestamps: true,
	modelName: "Section",
})
export default class Section extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare name: string;

	@ForeignKey(() => Course)
	@Column({ type: DataType.UUID, allowNull: false })
	declare courseId: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare instructorId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare year: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare semester: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare academicYear: string;

	@Column({ type: DataType.INTEGER, allowNull: true })
	declare maxStudents: number;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => Course, "courseId")
	declare course: Course;

	@BelongsTo(() => User, "instructorId")
	declare instructor: User;

	@HasMany(() => StudentEnrollment, "sectionId")
	declare enrollments: StudentEnrollment[];
}


