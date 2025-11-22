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
import Practicum from "./practicum";
import ReportTemplate from "./report-template";

@Table({
	tableName: "reports",
	timestamps: true,
	modelName: "Report",
})
export default class Report extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare studentId: string;

	@ForeignKey(() => Practicum)
	@Column({ type: DataType.UUID, allowNull: true })
	declare practicumId: string;

	@ForeignKey(() => ReportTemplate)
	@Column({ type: DataType.UUID, allowNull: true })
	declare templateId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare content: string;

	@Column({
		type: DataType.ENUM("weekly", "monthly", "final", "narrative"),
		allowNull: false,
	})
	declare type: "weekly" | "monthly" | "final" | "narrative";

	@Column({ type: DataType.INTEGER, allowNull: true })
	declare weekNumber: number;

	@Column({ type: DataType.DATE, allowNull: true })
	declare startDate: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare endDate: Date;

	@Column({
		type: DataType.ENUM("draft", "submitted", "approved", "rejected"),
		allowNull: false,
		defaultValue: "draft",
	})
	declare status: "draft" | "submitted" | "approved" | "rejected";

	@Column({ type: DataType.DATE, allowNull: true })
	declare dueDate: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare submittedDate: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare approvedDate: Date;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: true })
	declare approvedBy: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare feedback: string;

	@Column({ type: DataType.INTEGER, allowNull: true, validate: { min: 1, max: 5 } })
	declare rating: number;

	@Column({ type: DataType.FLOAT, allowNull: true })
	declare hoursLogged: number;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare activities: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare learnings: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare challenges: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare fileUrl: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => User, "studentId")
	declare student: User;

	@BelongsTo(() => Practicum, "practicumId")
	declare practicum: Practicum;

	@BelongsTo(() => ReportTemplate, "templateId")
	declare template: ReportTemplate;

	@BelongsTo(() => User, "approvedBy")
	declare approver: User;
}


