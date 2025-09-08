import {
	Table,
	Column,
	Model,
	DataType,
	CreatedAt,
	ForeignKey,
	BelongsTo,
} from "sequelize-typescript";
import User from "./user";

@Table({
	tableName: "file_attachments",
	timestamps: false,
	modelName: "FileAttachment",
	updatedAt: false,
})
export default class FileAttachment extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare fileName: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare originalName: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare mimeType: string;

	@Column({ type: DataType.INTEGER, allowNull: false })
	declare size: number;

	@Column({ type: DataType.STRING, allowNull: false })
	declare path: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare url: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare uploadedBy: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare entityType: string;

	@Column({ type: DataType.UUID, allowNull: false })
	declare entityId: string;

	@Column({ type: DataType.BOOLEAN, defaultValue: false })
	declare isPublic: boolean;

	@CreatedAt
	declare createdAt: Date;

	@BelongsTo(() => User, "uploadedBy")
	declare uploader: User;
}


