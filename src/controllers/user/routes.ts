import { Router } from "express";
import {
	activateUserController,
	getUserDetailsController,
	loginController,
	logoutController,
	refreshTokenController,
	registerUserController,
	forgotPasswordController,
	resetPasswordController,
	editUserController,
	changePasswordController,
} from ".";
import upload from "@/utils/uploader";
import { uploadUserAvatarUpdate, uploadUserAvatar } from "@/utils/image-handler";
import { isAuthenticated } from "@/middlewares/auth";

const router = Router();

router.post("/user/register", uploadUserAvatar, registerUserController);
router.post("/user/activate-user", activateUserController);

router.post("/user/", loginController);
router.get("/user/logout", isAuthenticated, logoutController);

router.get("/user/me", isAuthenticated, getUserDetailsController);

router.get("/user/refresh-token", refreshTokenController);

// Password reset
router.post("/user/forgot-password", forgotPasswordController);
router.post("/user/reset-password", resetPasswordController);

// Change password
router.put("/user/change-password", isAuthenticated, changePasswordController);
// Edit user
router.put("/user/:id", isAuthenticated, uploadUserAvatarUpdate, editUserController);


export default router;
