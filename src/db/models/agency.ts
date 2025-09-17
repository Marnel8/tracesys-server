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
import Supervisor from "./supervisor";
import Practicum from "./practicum";
import AgencyRequirement from "./agency-requirement";

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

	@Column({ type: DataType.DECIMAL(10, 8), allowNull: true })
	declare latitude: number;

	@Column({ type: DataType.DECIMAL(11, 8), allowNull: true })
	declare longitude: number;

	@ForeignKey(() => Department)
	@Column({ type: DataType.UUID, allowNull: true })
	declare departmentId: string;

	@Column({ type: DataType.TEXT, allowNull: true })
	declare description: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare website: string;

	@Column({ type: DataType.STRING, allowNull: true })
	declare industry: string;

	@Column({ type: DataType.INTEGER, allowNull: true })
	declare maxStudents: number;

	@Column({ type: DataType.STRING, allowNull: true })
	declare partnershipType: string;

	@Column({ type: DataType.DATE, allowNull: true })
	declare partnershipStartDate: Date;

	@Column({ type: DataType.DATE, allowNull: true })
	declare partnershipEndDate: Date;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => Department, "departmentId")
	declare department: Department;

	@HasMany(() => Supervisor, "agencyId")
	declare supervisors: Supervisor[];

	@HasMany(() => Practicum, "agencyId")
	declare practicums: Practicum[];

	@HasMany(() => AgencyRequirement, "agencyId")
	declare requirements: AgencyRequirement[];
}


