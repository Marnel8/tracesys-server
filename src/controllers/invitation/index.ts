import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import path from "path";
import fs from "fs";
import { BadRequestError } from "@/utils/error";
import {
  createInvitation,
  createBulkInvitations,
  validateInvitationToken,
  markInvitationAsUsed,
  getInvitationsByInstructor,
  deleteInvitation,
  getInvitationByToken,
} from "@/data/invitation";
import sendMail from "@/utils/send-mail";
import Department from "@/db/models/department";
import Section from "@/db/models/section";
import "dotenv/config";

interface CreateInvitationRequest {
  email: string;
  role: "student" | "instructor";
  departmentId?: string;
  sectionId?: string;
  program?: string;
  expiresInDays?: number;
}

interface BulkInvitationRequest {
  emails: string[];
  role: "student" | "instructor";
  departmentId?: string;
  sectionId?: string;
  program?: string;
  expiresInDays?: number;
}

const departmentNameCache = new Map<string, string | null>();
const sectionNameCache = new Map<string, string | null>();

const projectRoot = process.cwd();
const candidateAssetDirs = [
  path.join(projectRoot, "assets"),
  path.join(projectRoot, "src", "assets"),
  path.join(projectRoot, "dist", "assets"),
];
const assetsDir =
  candidateAssetDirs.find((p) => fs.existsSync(p)) || candidateAssetDirs[0];

const getDepartmentName = async (id?: string) => {
  if (!id) return undefined;
  if (departmentNameCache.has(id)) {
    return departmentNameCache.get(id) || undefined;
  }
  const department = await Department.findByPk(id);
  const name = department?.name || null;
  departmentNameCache.set(id, name);
  return name || undefined;
};

const getSectionName = async (id?: string) => {
  if (!id) return undefined;
  if (sectionNameCache.has(id)) {
    return sectionNameCache.get(id) || undefined;
  }
  const section = await Section.findByPk(id);
  const name = section?.name || null;
  sectionNameCache.set(id, name);
  return name || undefined;
};

export const createInvitationController = async (
  req: Request,
  res: Response
) => {
  const {
    email,
    role,
    departmentId,
    sectionId,
    program,
    expiresInDays,
  }: CreateInvitationRequest = req.body;
  const instructorId = (req as any).user?.id;

  if (!instructorId) {
    throw new BadRequestError("User not authenticated.");
  }

  if (!email || !role) {
    throw new BadRequestError("Email and role are required.");
  }

  if (role !== "student" && role !== "instructor") {
    throw new BadRequestError("Role must be either 'student' or 'instructor'.");
  }

  const invitation = await createInvitation({
    email,
    role,
    departmentId,
    sectionId,
    program,
    createdBy: instructorId,
    expiresInDays,
  });

  // Build invitation URL with embedded IDs
  const baseUrl =
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000";

  // Warn if using localhost in production
  if (baseUrl.includes("localhost") && process.env.NODE_ENV === "production") {
    console.warn(
      `[INVITATION] ⚠ WARNING: Using localhost URL in production! Set CLIENT_URL or FRONTEND_URL environment variable.`
    );
  }
  const invitationUrl = new URL(
    `/invitation/accept/${invitation.token}`,
    baseUrl
  );
  if (departmentId)
    invitationUrl.searchParams.set("departmentId", departmentId);
  if (sectionId) invitationUrl.searchParams.set("sectionId", sectionId);
  if (program) invitationUrl.searchParams.set("program", program);

  const departmentName = await getDepartmentName(departmentId);
  const sectionName = await getSectionName(sectionId);

  // Prepare attachments (only if logo exists)
  const attachments: { filename: string; path: string; cid: string }[] = [];
  const logoPath = path.join(assetsDir, "logo.png");
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: "logo.png",
      path: logoPath,
      cid: "logo",
    });
  }

  // Send invitation email
  let emailSent = false;
  let emailError: any = null;
  const logPrefix = `[INVITATION ${new Date().toISOString()}]`;

  console.log(`${logPrefix} Attempting to send invitation email to: ${email}`);
  console.log(`${logPrefix} Invitation URL: ${invitationUrl.toString()}`);

  try {
    // Send simple email with just the URL - no template engine
    const emailText = `
You're invited to join TracèSys as a ${role}.

Click the link below to accept your invitation:
${invitationUrl.toString()}

${
  departmentName || departmentId
    ? `Department: ${departmentName || departmentId}\n`
    : ""
}${sectionName || sectionId ? `Section: ${sectionName || sectionId}\n` : ""}${
      program ? `Program: ${program}\n` : ""
    }
This invitation expires in ${expiresInDays || 7} day(s).

If you didn't expect this invitation, you can safely ignore it.
    `.trim();

    await sendMail({
      email: email,
      subject: `Invitation to join TracèSys as ${role}`,
      text: emailText,
      // No template, no attachments needed for simple email
    });
    emailSent = true;
    console.log(
      `${logPrefix} ✓ Invitation email sent successfully to ${email}`
    );
  } catch (error) {
    emailError = error;
    console.error(`${logPrefix} ✗ Failed to send invitation email to ${email}`);
    console.error(`${logPrefix} Error details:`, error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error(`${logPrefix} Error message: ${error.message}`);
      console.error(`${logPrefix} Error stack:`, error.stack);

      // Log nodemailer specific errors
      if ((error as any).code) {
        console.error(
          `${logPrefix} Nodemailer error code: ${(error as any).code}`
        );
      }
      if ((error as any).command) {
        console.error(
          `${logPrefix} Failed SMTP command: ${(error as any).command}`
        );
      }
      if ((error as any).response) {
        console.error(`${logPrefix} SMTP response: ${(error as any).response}`);
      }
      if ((error as any).responseCode) {
        console.error(
          `${logPrefix} SMTP response code: ${(error as any).responseCode}`
        );
      }
    } else {
      console.error(`${logPrefix} Unknown error type:`, typeof error, error);
    }
  }

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: emailSent
      ? "Invitation created and sent successfully"
      : "Invitation created but email failed to send",
    data: {
      invitation,
      invitationUrl: invitationUrl.toString(),
      emailSent,
      ...(emailError && {
        emailError:
          emailError instanceof Error ? emailError.message : "Unknown error",
      }),
    },
  });
};

export const createBulkInvitationsController = async (
  req: Request,
  res: Response
) => {
  const {
    emails,
    role,
    departmentId,
    sectionId,
    program,
    expiresInDays,
  }: BulkInvitationRequest = req.body;
  const instructorId = (req as any).user?.id;

  if (!instructorId) {
    throw new BadRequestError("User not authenticated.");
  }

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    throw new BadRequestError("At least one email address is required.");
  }

  if (!role || (role !== "student" && role !== "instructor")) {
    throw new BadRequestError("Role must be either 'student' or 'instructor'.");
  }

  const invitations = await createBulkInvitations({
    emails,
    role,
    departmentId,
    sectionId,
    program,
    createdBy: instructorId,
    expiresInDays,
  });

  // Send invitation emails
  const baseUrl =
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000";

  // Prepare attachments (only if logo exists)
  const attachments: { filename: string; path: string; cid: string }[] = [];
  const logoPath = path.join(assetsDir, "logo.png");
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: "logo.png",
      path: logoPath,
      cid: "logo",
    });
  }

  const emailResults = await Promise.allSettled(
    invitations.map(async (invitation) => {
      const deptName = await getDepartmentName(
        invitation.departmentId || departmentId
      );
      const secName = await getSectionName(invitation.sectionId || sectionId);
      const invitationUrl = new URL(
        `/invitation/accept/${invitation.token}`,
        baseUrl
      );
      if (departmentId)
        invitationUrl.searchParams.set("departmentId", departmentId);
      if (sectionId) invitationUrl.searchParams.set("sectionId", sectionId);
      if (program) invitationUrl.searchParams.set("program", program);

      const logPrefix = `[BULK-INVITATION ${new Date().toISOString()}]`;
      try {
        console.log(`${logPrefix} Sending invitation to: ${invitation.email}`);
        await sendMail({
          email: invitation.email,
          subject: `Invitation to join TracèSys as ${role}`,
          template: "invitation-mail.ejs",
          data: {
            email: invitation.email,
            role,
            invitationUrl: invitationUrl.toString(),
            departmentId: invitation.departmentId || departmentId,
            departmentName: deptName,
            sectionId: invitation.sectionId || sectionId,
            sectionName: secName,
            program,
            expiresInDays: expiresInDays || 7,
          },
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        console.log(
          `${logPrefix} ✓ Invitation email sent successfully to ${invitation.email}`
        );
        return { email: invitation.email, success: true };
      } catch (error) {
        console.error(
          `${logPrefix} ✗ Failed to send invitation email to ${invitation.email}`
        );
        console.error(`${logPrefix} Error:`, error);
        if (error instanceof Error) {
          console.error(`${logPrefix} Error message: ${error.message}`);
          console.error(`${logPrefix} Error stack:`, error.stack);
        }
        return {
          email: invitation.email,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })
  );

  const successful = emailResults.filter(
    (result) => result.status === "fulfilled" && result.value.success
  ).length;
  const failed = emailResults.filter(
    (result) =>
      result.status === "rejected" ||
      (result.status === "fulfilled" && !result.value.success)
  );

  res.status(StatusCodes.CREATED).json({
    success: true,
    message:
      failed.length > 0
        ? `${successful} invitation(s) sent successfully, ${failed.length} failed`
        : `${invitations.length} invitation(s) created and sent successfully`,
    data: {
      invitations,
      count: invitations.length,
      emailStats: {
        total: invitations.length,
        successful,
        failed: failed.length,
        ...(failed.length > 0 && {
          failedEmails: failed.map((f) =>
            f.status === "fulfilled" ? f.value.email : "unknown"
          ),
        }),
      },
    },
  });
};

export const validateInvitationController = async (
  req: Request,
  res: Response
) => {
  const { token } = req.params;

  if (!token) {
    throw new BadRequestError("Invitation token is required.");
  }

  const invitation = await validateInvitationToken(token);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Invitation is valid",
    data: invitation,
  });
};

export const getInvitationsController = async (req: Request, res: Response) => {
  const instructorId = (req as any).user?.id;
  const { status, limit, offset, search } = req.query;

  if (!instructorId) {
    throw new BadRequestError("User not authenticated.");
  }

  const result = await getInvitationsByInstructor(instructorId, {
    status: status as "pending" | "used" | "expired" | "all" | undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
    search: search ? String(search) : undefined,
  });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Invitations retrieved successfully",
    data: result,
  });
};

export const deleteInvitationController = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const instructorId = (req as any).user?.id;

  if (!instructorId) {
    throw new BadRequestError("User not authenticated.");
  }

  if (!id) {
    throw new BadRequestError("Invitation ID is required.");
  }

  await deleteInvitation(id, instructorId);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Invitation deleted successfully",
  });
};
