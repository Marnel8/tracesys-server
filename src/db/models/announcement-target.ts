import {
	Table,
	Column,
	Model,
	DataType,
	CreatedAt,
	ForeignKey,
	BelongsTo,
} from "sequelize-typescript";
import Announcement from "./announcement";

@Table({
	tableName: "announcement_targets",
	timestamps: false,
	modelName: "AnnouncementTarget",
	updatedAt: false,
})
export default class AnnouncementTarget extends Model {
	@Column({
		type: DataType.UUID,
		primaryKey: true,
		defaultValue: DataType.UUIDV4,
	})
	declare id: string;

	@ForeignKey(() => Announcement)
	@Column({ type: DataType.UUID, allowNull: false })
	declare announcementId: string;

	@Column({
		type: DataType.ENUM("section", "course", "department", "all"),
		allowNull: false,
	})
	declare targetType: "section" | "course" | "department" | "all";

	@Column({ type: DataType.UUID, allowNull: true })
	declare targetId: string;

	@CreatedAt
	declare createdAt: Date;

	@BelongsTo(() => Announcement, "announcementId")
	declare announcement: Announcement;
}


