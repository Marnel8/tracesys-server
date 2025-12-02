"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGoogleOAuthCallback = exports.initiateGoogleOAuth = void 0;
const googleapis_1 = require("googleapis");
const error_1 = require("../../utils/error.js");
const jwt_1 = require("../../utils/jwt.js");
const user_1 = __importDefault(require("../../db/models/user.js"));
const invitation_1 = require("../../data/invitation.js");
const student_1 = require("../../data/student.js");
const user_2 = require("../../db/models/user.js");
require("dotenv/config");
// Initialize OAuth2 client
const getOAuth2Client = () => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error("Google OAuth environment variables are not configured");
    }
    const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI ||
        `${process.env.API_URL || "http://localhost:5001"}/api/v1/auth/google/callback`);
    return oauth2Client;
};
// Sanitize redirect path to prevent open redirects and invalid targets
const sanitizeRedirectPath = (raw) => {
    if (!raw)
        return undefined;
    // Must be an internal path and not contain dangerous patterns
    if (!raw.startsWith("/") ||
        raw.includes("//") ||
        raw.includes(":") ||
        raw.toLowerCase().includes("javascript:") ||
        raw.toLowerCase().includes("data:")) {
        return undefined;
    }
    // Allow only known safe prefixes
    if (raw.startsWith("/dashboard/instructor") ||
        raw.startsWith("/dashboard/student") ||
        raw.startsWith("/onboarding/instructor") ||
        raw.startsWith("/onboarding/student")) {
        return raw;
    }
    return undefined;
};
/**
 * Initiates Google OAuth flow
 * GET /api/v1/auth/google
 *
 * Query params:
 * - role: "instructor" | "student" (optional)
 * - invitationToken: string (optional)
 * - redirect: string (optional - where to redirect after success)
 */
const initiateGoogleOAuth = async (req, res) => {
    try {
        const { role, invitationToken, redirect } = req.query;
        // Build state parameter with metadata
        const state = {
            timestamp: Date.now(),
        };
        if (role && (role === "instructor" || role === "student")) {
            state.role = role;
        }
        if (invitationToken && typeof invitationToken === "string") {
            state.invitationToken = invitationToken;
        }
        if (redirect && typeof redirect === "string") {
            state.redirect = redirect;
        }
        // Encode state as base64 JSON
        const stateParam = Buffer.from(JSON.stringify(state)).toString("base64");
        const oauth2Client = getOAuth2Client();
        // Generate authorization URL
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: [
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/userinfo.email",
            ],
            state: stateParam,
            prompt: "select_account", // Always show account selection
        });
        console.log("[OAuth] Initiating Google OAuth flow", {
            role: state.role,
            hasInvitationToken: !!state.invitationToken,
            hasRedirect: !!state.redirect,
        });
        // Redirect to Google consent screen
        res.redirect(authUrl);
    }
    catch (error) {
        console.error("[OAuth] Error initiating OAuth:", error);
        const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
        res.redirect(`${clientUrl}/auth/error?error=oauth_initiate_failed&message=${encodeURIComponent("Failed to initiate Google sign-in")}`);
    }
};
exports.initiateGoogleOAuth = initiateGoogleOAuth;
/**
 * Handles Google OAuth callback
 * GET /api/v1/auth/google/callback
 *
 * Query params (from Google):
 * - code: authorization code
 * - state: base64 encoded state parameter
 * - error: error code (if user denied)
 */
const handleGoogleOAuthCallback = async (req, res) => {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    try {
        const { code, state, error } = req.query;
        // Handle user denial or errors from Google
        if (error) {
            console.error("[OAuth] User denied or error from Google:", error);
            return res.redirect(`${clientUrl}/auth/error?error=oauth_denied&message=${encodeURIComponent("Google sign-in was cancelled")}`);
        }
        // Validate required parameters
        if (!code || typeof code !== "string") {
            throw new error_1.BadRequestError("Missing authorization code");
        }
        if (!state || typeof state !== "string") {
            throw new error_1.BadRequestError("Missing state parameter");
        }
        // Decode and validate state parameter
        let decodedState;
        try {
            const stateJson = Buffer.from(state, "base64").toString("utf-8");
            decodedState = JSON.parse(stateJson);
            // Validate state timestamp (prevent replay attacks - 10 min expiry)
            const stateAge = Date.now() - decodedState.timestamp;
            if (stateAge > 10 * 60 * 1000) {
                throw new Error("State parameter expired");
            }
        }
        catch (err) {
            console.error("[OAuth] Invalid state parameter:", err);
            throw new error_1.BadRequestError("Invalid state parameter");
        }
        const oauth2Client = getOAuth2Client();
        // Exchange authorization code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        // Fetch user info from Google
        const oauth2 = googleapis_1.google.oauth2({ version: "v2", auth: oauth2Client });
        const userInfoResponse = await oauth2.userinfo.get();
        const googleUser = userInfoResponse.data;
        if (!googleUser.email) {
            throw new error_1.BadRequestError("Email not provided by Google");
        }
        console.log("[OAuth] Google user authenticated:", {
            email: googleUser.email,
            name: googleUser.name,
            hasInvitationToken: !!decodedState.invitationToken,
        });
        // Check if user already exists
        const existingUser = await user_1.default.findOne({
            where: { email: googleUser.email },
        });
        let user;
        let needsOnboarding = false;
        if (existingUser) {
            // User exists - validate they're active
            if (!existingUser.isActive) {
                return res.redirect(`${clientUrl}/auth/error?error=account_deactivated&message=${encodeURIComponent("Your account has been deactivated. Please contact your administrator.")}`);
            }
            // Mark invitation as used if provided
            if (decodedState.invitationToken) {
                try {
                    await (0, invitation_1.markInvitationAsUsed)(decodedState.invitationToken);
                }
                catch (error) {
                    // Invitation might already be used, continue anyway
                    console.warn("[OAuth] Failed to mark invitation as used:", error);
                }
            }
            user = existingUser;
            needsOnboarding =
                !user.age ||
                    !user.phone ||
                    !user.gender ||
                    (user.role === "student" && !user.studentId);
            console.log("[OAuth] Existing user logged in:", {
                userId: user.id,
                role: user.role,
                needsOnboarding,
            });
        }
        else {
            // New user - require invitation token
            if (!decodedState.invitationToken) {
                return res.redirect(`${clientUrl}/auth/error?error=invitation_required&message=${encodeURIComponent("Invitation token is required for new user registration")}`);
            }
            // Validate invitation
            const invitation = await (0, invitation_1.validateInvitationToken)(decodedState.invitationToken);
            // Check if email matches invitation
            if (invitation.email !== googleUser.email) {
                return res.redirect(`${clientUrl}/auth/error?error=email_mismatch&message=${encodeURIComponent("Google account email does not match invitation email")}`);
            }
            // Create user based on invitation role
            if (invitation.role === "student") {
                if (!invitation.sectionId) {
                    throw new error_1.BadRequestError("Section ID is required for student registration");
                }
                const result = await (0, student_1.createStudentFromOAuth)({
                    email: googleUser.email,
                    firstName: googleUser.given_name || googleUser.name?.split(" ")[0] || "",
                    lastName: googleUser.family_name ||
                        googleUser.name?.split(" ").slice(1).join(" ") ||
                        "",
                    avatar: googleUser.picture || undefined,
                    provider: "google",
                    departmentId: invitation.departmentId || undefined,
                    sectionId: invitation.sectionId,
                    program: invitation.program || undefined,
                });
                // Mark invitation as used
                await (0, invitation_1.markInvitationAsUsed)(decodedState.invitationToken);
                const createdUser = await user_1.default.findByPk(result.user.id);
                if (!createdUser) {
                    throw new Error("Newly created student not found");
                }
                user = createdUser;
                needsOnboarding =
                    !user.age || !user.phone || !user.gender || !user.studentId;
                console.log("[OAuth] New student created:", {
                    userId: user.id,
                    needsOnboarding,
                });
            }
            else if (invitation.role === "instructor") {
                // Create instructor user
                const instructor = await user_1.default.create({
                    email: googleUser.email,
                    firstName: googleUser.given_name || googleUser.name?.split(" ")[0] || "",
                    lastName: googleUser.family_name ||
                        googleUser.name?.split(" ").slice(1).join(" ") ||
                        "",
                    password: null,
                    role: user_2.UserRole.INSTRUCTOR,
                    avatar: googleUser.picture || "",
                    provider: "google",
                    emailVerified: true,
                    isActive: true,
                });
                // Mark invitation as used
                await (0, invitation_1.markInvitationAsUsed)(decodedState.invitationToken);
                user = instructor;
                needsOnboarding = !user.age || !user.phone || !user.gender;
                console.log("[OAuth] New instructor created:", {
                    userId: user.id,
                    needsOnboarding,
                });
            }
            else {
                throw new error_1.BadRequestError("Invalid invitation role");
            }
        }
        // Generate JWT tokens
        const { accessToken, refreshToken } = (0, jwt_1.createAuthTokens)(user);
        // Set tokens in httpOnly cookies
        const accessOptions = (0, jwt_1.getAccessTokenOptions)();
        const refreshOptions = (0, jwt_1.getRefreshTokenOptions)();
        res.cookie("access_token", accessToken, accessOptions);
        res.cookie("refresh_token", refreshToken, refreshOptions);
        console.log("[OAuth] Tokens set in cookies for user:", {
            userId: user.id,
            role: user.role,
        });
        // Determine redirect URL
        let redirectUrl;
        const safeRedirect = sanitizeRedirectPath(decodedState.redirect);
        if (safeRedirect) {
            // Use custom redirect if provided and valid
            redirectUrl = `${clientUrl}${safeRedirect}`;
        }
        else if (needsOnboarding) {
            // Redirect to onboarding if needed
            redirectUrl = `${clientUrl}/onboarding/${user.role}`;
        }
        else {
            // Redirect to dashboard
            redirectUrl = `${clientUrl}/dashboard/${user.role}`;
        }
        console.log("[OAuth] Redirecting to:", redirectUrl);
        // Redirect to client with success
        res.redirect(redirectUrl);
    }
    catch (error) {
        console.error("[OAuth] Callback error:", error);
        // Determine error type and message
        let errorCode = "oauth_failed";
        let errorMessage = "Google sign-in failed";
        if (error.message) {
            errorMessage = error.message;
        }
        if (error.message?.includes("invitation")) {
            errorCode = "invalid_invitation";
        }
        else if (error.message?.includes("email")) {
            errorCode = "email_mismatch";
        }
        res.redirect(`${clientUrl}/auth/error?error=${errorCode}&message=${encodeURIComponent(errorMessage)}`);
    }
};
exports.handleGoogleOAuthCallback = handleGoogleOAuthCallback;
