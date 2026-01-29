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
import Agency from "./agency";
import Practicum from "./practicum";
import User from "./user";

@Table({
	tableName: "supervisors",
	timestamps: true,
	modelName: "Supervisor",
})
export default class Supervisor extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => Agency)
	@Column({ type: DataType.UUID, allowNull: false })
	declare agencyId: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare name: string;

	@Column({ type: DataType.STRING, allowNull: false, validate: { isEmail: true } })
	declare email: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare phone: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare position: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare department: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@ForeignKey(() => User)
	@Index({ name: "idx_supervisors_createdByInstructorId" })
	@Column({ type: DataType.UUID, allowNull: true })
	declare createdByInstructorId: string | null;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => Agency, "agencyId")
	declare agency: Agency;

	@BelongsTo(() => User, { foreignKey: "createdByInstructorId", onDelete: "SET NULL", onUpdate: "CASCADE" })
	declare createdByInstructor: User;

	@HasMany(() => Practicum, "supervisorId")
	declare practicums: Practicum[];
}


