"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_typescript_1 = require("sequelize-typescript");
require("dotenv/config");
const colors_1 = __importDefault(require("colors"));
const user_1 = __importDefault(require("./models/user.js"));
const department_1 = __importDefault(require("./models/department.js"));
const course_1 = __importDefault(require("./models/course.js"));
const section_1 = __importDefault(require("./models/section.js"));
const student_enrollment_1 = __importDefault(require("./models/student-enrollment.js"));
const agency_1 = __importDefault(require("./models/agency.js"));
const agency_requirement_1 = __importDefault(require("./models/agency-requirement.js"));
const supervisor_1 = __importDefault(require("./models/supervisor.js"));
const practicum_1 = __importDefault(require("./models/practicum.js"));
const attendance_record_1 = __importDefault(require("./models/attendance-record.js"));
const detailed_attendance_log_1 = __importDefault(require("./models/detailed-attendance-log.js"));
const report_template_1 = __importDefault(require("./models/report-template.js"));
const report_1 = __importDefault(require("./models/report.js"));
const requirement_template_1 = __importDefault(require("./models/requirement-template.js"));
const requirement_1 = __importDefault(require("./models/requirement.js"));
const requirement_comment_1 = __importDefault(require("./models/requirement-comment.js"));
const announcement_1 = __importDefault(require("./models/announcement.js"));
const announcement_target_1 = __importDefault(require("./models/announcement-target.js"));
const announcement_comment_1 = __importDefault(require("./models/announcement-comment.js"));
const audit_log_1 = __importDefault(require("./models/audit-log.js"));
const achievement_template_1 = __importDefault(require("./models/achievement-template.js"));
const achievement_1 = __importDefault(require("./models/achievement.js"));
const file_attachment_1 = __importDefault(require("./models/file-attachment.js"));
const invitation_1 = __importDefault(require("./models/invitation.js"));
const sequelize = new sequelize_typescript_1.Sequelize({
    database: process.env.DB_NAME,
    dialect: "mysql",
    username: process.env.DB_USER,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    models: [
        user_1.default,
        department_1.default,
        course_1.default,
        section_1.default,
        student_enrollment_1.default,
        agency_1.default,
        agency_requirement_1.default,
        supervisor_1.default,
        practicum_1.default,
        attendance_record_1.default,
        detailed_attendance_log_1.default,
        report_template_1.default,
        report_1.default,
        requirement_template_1.default,
        requirement_1.default,
        requirement_comment_1.default,
        announcement_1.default,
        announcement_target_1.default,
        announcement_comment_1.default,
        audit_log_1.default,
        achievement_template_1.default,
        achievement_1.default,
        file_attachment_1.default,
        invitation_1.default,
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
    console.log(colors_1.default.green(`Connected to the database: ${process.env.DB_NAME}`));
    if (process.env.DB_SYNC_ALTER === "true") {
        console.log(colors_1.default.yellow("DB_SYNC_ALTER enabled - running sync({ alter: true })"));
        await sequelize.sync({ alter: true, force: false });
        console.log(colors_1.default.green("Database synchronized successfully."));
    }
})
    .catch((error) => {
    console.error(colors_1.default.red("Unable to connect to the database:"), error);
});
// To run a one-time destructive sync use DB_SYNC_FORCE=true (not recommended in prod)
if (process.env.DB_SYNC_FORCE === "true") {
    sequelize.sync({ alter: true, force: false }).then(() => {
        console.log(colors_1.default.red("Database FORCE synchronized - all tables dropped and recreated."));
    });
}
exports.default = sequelize;
