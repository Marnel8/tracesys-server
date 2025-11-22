import { Router } from "express";
import { upsertPracticumController } from ".";
import { isAuthenticated, authorizeRoles } from "@/middlewares/auth";

const router = Router();

router.post("/practicum/", isAuthenticated, authorizeRoles("student"), upsertPracticumController);

export default router;




