import { Router } from "express";
import {
	activateUserController,
	getUserDetailsController,
	loginController,
	logoutController,
	refreshTokenController,
	registerUserController,
} from ".";
import upload from "@/utils/uploader";
import { isAuthenticated } from "@/middlewares/auth";

const router = Router();

router.post("/user/register", upload.single("avatar"), registerUserController);
router.post("/user/activate-user", activateUserController);

router.post("/user/", loginController);
router.get("/user/logout", isAuthenticated, logoutController);

router.get("/user/me", isAuthenticated, getUserDetailsController);

router.get("/user/refresh-token", isAuthenticated, refreshTokenController);

export default router;
