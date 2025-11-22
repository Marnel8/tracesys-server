import { Sequelize } from "sequelize-typescript";
import "dotenv/config";
import colors from "colors";

import User from "./models/user";
import Department from "./models/department";
import Course from "./models/course";
import Section from "./models/section";
import StudentEnrollment from "./models/student-enrollment";
import Agency from "./models/agency";
import AgencyRequirement from "./models/agency-requirement";
import Supervisor from "./models/supervisor";
import Practicum from "./models/practicum";
import AttendanceRecord from "./models/attendance-record";
import DetailedAttendanceLog from "./models/detailed-attendance-log";
import ReportTemplate from "./models/report-template";
import Report from "./models/report";
import RequirementTemplate from "./models/requirement-template";
import Requirement from "./models/requirement";
import RequirementComment from "./models/requirement-comment";
import Announcement from "./models/announcement";
import AnnouncementTarget from "./models/announcement-target";
import AnnouncementComment from "./models/announcement-comment";
import AuditLog from "./models/audit-log";
import AchievementTemplate from "./models/achievement-template";
import Achievement from "./models/achievement";
import FileAttachment from "./models/file-attachment";
import Invitation from "./models/invitation";

const sequelize = new Sequelize({
	database: process.env.DB_NAME,
	dialect: "mysql",
	username: process.env.DB_USER,
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT),
	models: [
		User,
		Department,
		Course,
		Section,
		StudentEnrollment,
		Agency,
		AgencyRequirement,
		Supervisor,
		Practicum,
		AttendanceRecord,
		DetailedAttendanceLog,
		ReportTemplate,
		Report,
		RequirementTemplate,
		Requirement,
		RequirementComment,
		Announcement,
		AnnouncementTarget,
		AnnouncementComment,
		AuditLog,
		AchievementTemplate,
		Achievement,
		FileAttachment,
		Invitation,
	],
	password: process.env.DB_PASSWORD,
	define: {
		underscored: false, // Keep camelCase for model attributes
		freezeTableName: true, // Don't pluralize table names
	},
});

sequelize
	.authenticate()
	.then(async () => {
		console.log(
			colors.green(`Connected to the database: ${process.env.DB_NAME}`)
		);
		if (process.env.DB_SYNC_ALTER === "true") {
			console.log(colors.yellow("DB_SYNC_ALTER enabled - running sync({ alter: true })"));
			await sequelize.sync({ alter: true, force: false });
			console.log(colors.green("Database synchronized successfully."));
		}
	})
	.catch((error) => {
		console.error(colors.red("Unable to connect to the database:"), error);
	});


// To run a one-time destructive sync use DB_SYNC_FORCE=true (not recommended in prod)
if (process.env.DB_SYNC_FORCE === "true") {
	sequelize.sync({ alter: true, force: false }).then(() => {
		console.log(colors.red("Database FORCE synchronized - all tables dropped and recreated."));
	});
}

export default sequelize;
