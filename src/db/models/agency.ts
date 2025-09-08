import {
	Table,
	Column,
	Model,
	DataType,
	CreatedAt,
	UpdatedAt,
	HasMany,
} from "sequelize-typescript";
import Supervisor from "./supervisor";
import Practicum from "./practicum";

@Table({
	tableName: "agencies",
	timestamps: true,
	modelName: "Agency",
})
export default class Agency extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare name: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare address: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare contactPerson: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare contactRole: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare contactPhone: string;

	@Column({ type: DataType.STRING, allowNull: false, validate: { isEmail: true } })
	declare contactEmail: string;

	@Column({
		type: DataType.ENUM("Main", "Branch"),
		allowNull: false,
		defaultValue: "Main",
	})
	declare branchType: "Main" | "Branch";

	@Column({ type: DataType.TIME, allowNull: true })
	declare openingTime: string;

	@Column({ type: DataType.TIME, allowNull: true })
	declare closingTime: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: true })
	declare isActive: boolean;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@HasMany(() => Supervisor, "agencyId")
	declare supervisors: Supervisor[];

	@HasMany(() => Practicum, "agencyId")
	declare practicums: Practicum[];
}


