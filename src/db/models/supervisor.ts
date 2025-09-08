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
import Agency from "./agency";
import Practicum from "./practicum";

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

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => Agency, "agencyId")
	declare agency: Agency;

	@HasMany(() => Practicum, "supervisorId")
	declare practicums: Practicum[];
}


