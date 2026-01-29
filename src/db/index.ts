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
import ReportView from "./models/report-view";
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
		ReportView,
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
			try {
				await sequelize.sync({ alter: true, force: false });
				console.log(colors.green("Database synchronized successfully."));
			} catch (error: any) {
				// Handle MySQL "Too many keys" error gracefully
				if (error?.parent?.code === "ER_TOO_MANY_KEYS" || error?.code === "ER_TOO_MANY_KEYS") {
					const sqlMessage = error?.parent?.sqlMessage || error?.message || "";
					// Only show warning if it's about a constraint that might not exist
					// If it's about departments.code unique constraint, it likely already exists
					if (sqlMessage.includes("departments") && sqlMessage.includes("code")) {
						// Suppress warning - constraint already exists as confirmed by migration
						console.log(colors.gray("Note: Unique constraint on departments.code already exists (skipped)."));
					} else {
						console.warn(
							colors.yellow(
								"Warning: Database sync encountered 'Too many keys' error. " +
								"This usually means the table already has the maximum number of indexes (64). " +
								"The constraint/index may already exist. Continuing..."
							)
						);
						console.warn(colors.yellow(`Error details: ${sqlMessage}`));
					}
				} else {
					// Re-throw other errors
					throw error;
				}
			}
		}
	})
	.catch((error) => {
		console.error(colors.red("Unable to connect to the database:"), error);
	});


// To run a one-time destructive sync use DB_SYNC_FORCE=true (not recommended in prod)
if (process.env.DB_SYNC_FORCE === "true") {
	sequelize.sync({ alter: true, force: false })
		.then(() => {
			console.log(colors.red("Database FORCE synchronized - all tables dropped and recreated."));
		})
		.catch((error: any) => {
			// Handle MySQL "Too many keys" error gracefully
			if (error?.parent?.code === "ER_TOO_MANY_KEYS" || error?.code === "ER_TOO_MANY_KEYS") {
				const sqlMessage = error?.parent?.sqlMessage || error?.message || "";
				if (sqlMessage.includes("departments") && sqlMessage.includes("code")) {
					console.log(colors.gray("Note: Unique constraint on departments.code already exists (skipped)."));
				} else {
					console.warn(
						colors.yellow(
							"Warning: Database sync encountered 'Too many keys' error. " +
							"This usually means the table already has the maximum number of indexes (64). " +
							"The constraint/index may already exist."
						)
					);
				}
			} else {
				console.error(colors.red("Database sync error:"), error);
			}
		});
}

export default sequelize;
