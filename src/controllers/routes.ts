import usersRoutes from "./user/routes";
import studentRoutes from "./student/routes";
import agencyRoutes from "./agency/routes";
import departmentRoutes from "./department/routes";
import courseRoutes from "./course/routes";
import sectionRoutes from "./section/routes";

export const routes = [usersRoutes, studentRoutes, agencyRoutes, departmentRoutes, courseRoutes, sectionRoutes] as const;

export type AppRoutes = (typeof routes)[number];
