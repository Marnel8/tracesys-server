import usersRoutes from "./user/routes";
import studentRoutes from "./student/routes";
import agencyRoutes from "./agency/routes";
import departmentRoutes from "./department/routes";
import courseRoutes from "./course/routes";
import sectionRoutes from "./section/routes";
import announcementRoutes from "./announcement/routes";
import requirementTemplateRoutes from "./requirement-template/routes";
import requirementRoutes from "./requirement/routes";
import attendanceRoutes from "./attendance/routes";
import reportRoutes from "./report/routes";
import auditRoutes from "./audit/routes";

export const routes = [usersRoutes, studentRoutes, agencyRoutes, departmentRoutes, courseRoutes, sectionRoutes, announcementRoutes, requirementTemplateRoutes, requirementRoutes, attendanceRoutes, reportRoutes, auditRoutes] as const;

export type AppRoutes = (typeof routes)[number];
