"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _1 = require("./index.js");
const oauth_callback_1 = require("../auth/oauth-callback.js");
const oauth_google_1 = require("../auth/oauth-google.js");
const image_handler_1 = require("../../utils/image-handler.js");
const auth_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
router.post("/user/register", image_handler_1.uploadUserAvatar, _1.registerUserController);
router.post("/user/activate-user", _1.activateUserController);
router.post("/user/", _1.loginController);
router.get("/user/logout", auth_1.isAuthenticated, _1.logoutController);
router.get("/user/me", auth_1.isAuthenticated, _1.getUserDetailsController);
router.get("/user/refresh-token", _1.refreshTokenController);
// Password reset
router.post("/user/forgot-password", _1.forgotPasswordController);
router.post("/user/reset-password", _1.resetPasswordController);
// Change password
router.put("/user/change-password", auth_1.isAuthenticated, _1.changePasswordController);
// Update allow login without requirements setting
router.put("/user/allow-login-without-requirements", auth_1.isAuthenticated, _1.updateAllowLoginWithoutRequirementsController);
// Edit user
router.put("/user/:id", auth_1.isAuthenticated, image_handler_1.uploadUserAvatarUpdate, _1.editUserController);
// Admin-only routes
router.get("/user", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), _1.getUsersController);
router.post("/user/create", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), image_handler_1.uploadUserAvatar, _1.createUserAdminController);
router.delete("/user/:id", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), _1.deleteUserController);
router.put("/user/:id/status", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), _1.toggleUserStatusController);
router.post("/user/seed-admin", _1.seedAdminController);
// OAuth routes
router.get("/auth/google", oauth_google_1.initiateGoogleOAuth);
router.get("/auth/google/callback", oauth_google_1.handleGoogleOAuthCallback);
// OAuth callback (legacy - for NextAuth compatibility during migration)
router.post("/auth/oauth-callback", oauth_callback_1.handleOAuthCallback);
exports.default = router;
