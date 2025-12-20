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
import Report from "./report";
import User from "./user";

@Table({
	tableName: "report_views",
	timestamps: true,
	modelName: "ReportView",
})
export default class ReportView extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => Report)
	@Column({ type: DataType.UUID, allowNull: false })
	declare reportId: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare studentId: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare instructorId: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => Report, "reportId")
	declare report: Report;

	@BelongsTo(() => User, "studentId")
	declare student: User;

	@BelongsTo(() => User, "instructorId")
	declare instructor: User;
}









