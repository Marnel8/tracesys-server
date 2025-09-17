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
import Practicum from "./practicum";

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

	@Column({ type: DataType.STRING, allowNull: false })
	declare code: string;

	@ForeignKey(() => Course)
	@Column({ type: DataType.UUID, allowNull: true })
	declare courseId: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: true })
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

	@Column({ type: DataType.TEXT, allowNull: true })
	declare description: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare schedule: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare room: string;

	@Column({ type: DataType.DATE, allowNull: true })
	declare startDate: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare endDate: Date;

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

	@HasMany(() => Practicum, "sectionId")
	declare practicums: Practicum[];
}


