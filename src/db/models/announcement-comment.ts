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
import Announcement from "./announcement";
import User from "./user";

@Table({
	tableName: "announcement_comments",
	timestamps: true,
	modelName: "AnnouncementComment",
})
export default class AnnouncementComment extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => Announcement)
	@Column({ type: DataType.UUID, allowNull: false })
	declare announcementId: string;

	@ForeignKey(() => User)
	@Column({ type: DataType.UUID, allowNull: false })
	declare userId: string;

	@Column({ type: DataType.TEXT, allowNull: false })
	declare content: string;

	@CreatedAt
	declare createdAt: Date;

	@UpdatedAt
	declare updatedAt: Date;

	@BelongsTo(() => Announcement, "announcementId")
	declare announcement: Announcement;

	@BelongsTo(() => User, "userId")
	declare user: User;
}


