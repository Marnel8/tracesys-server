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
import User from "./user";
import AnnouncementTarget from "./announcement-target";
import AnnouncementComment from "./announcement-comment";

@Table({
	tableName: "announcements",
	timestamps: true,
	modelName: "Announcement",
})
export default class Announcement extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@Column({ type: DataType.STRING, allowNull: false })
	declare title: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare content: string;

	@Column({
		type: DataType.ENUM("Low", "Medium", "High"),
		allowNull: false,
		defaultValue: "Medium",
	})
	declare priority: "Low" | "Medium" | "High";

	@Column({
		type: DataType.ENUM("Draft", "Published", "Archived"),
		allowNull: false,
		defaultValue: "Draft",
	})
	declare status: "Draft" | "Published" | "Archived";

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare authorId: string;

	@Column({ type: DataType.DATE, allowNull: true })
	declare expiryDate: Date;

	@Column({ type: DataType.BOOLEAN, defaultValue: false })
	declare isPinned: boolean;

	@Column({ type: DataType.INTEGER, defaultValue: 0 })
	declare views: number;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => User, "authorId")
	declare author: User;

	@HasMany(() => AnnouncementTarget, "announcementId")
	declare targets: AnnouncementTarget[];

	@HasMany(() => AnnouncementComment, "announcementId")
	declare comments: AnnouncementComment[];
}


