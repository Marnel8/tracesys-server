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
  const baseUrl = process.env.CLIENT_URL || "http://localhost:3000";
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

  // Send invitation email
  try {
    await sendMail({
      email: email,
      subject: `Invitation to join TracèSys as ${role}`,
      template: "invitation-mail.ejs",
      data: {
        email,
        role,
        invitationUrl: invitationUrl.toString(),
        departmentId,
        departmentName,
        sectionId,
        sectionName,
        program,
        expiresInDays: expiresInDays || 7,
      },
      attachments: [
        {
          filename: "logo.png",
          path: path.join(assetsDir, "logo.png"),
          cid: "logo",
        },
      ],
    });
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    // Don't fail the request if email fails, invitation is still created
  }

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Invitation created and sent successfully",
    data: {
      invitation,
      invitationUrl: invitationUrl.toString(),
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
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const emailPromises = invitations.map(async (invitation) => {
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

    try {
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
        attachments: [
          {
            filename: "logo.png",
            path: path.join(assetsDir, "logo.png"),
            cid: "logo",
          },
        ],
      });
    } catch (error) {
      console.error(
        `Failed to send invitation email to ${invitation.email}:`,
        error
      );
    }
  });

  // Send emails in parallel (don't await to avoid blocking)
  Promise.all(emailPromises).catch((error) => {
    console.error("Error sending bulk invitation emails:", error);
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: `${invitations.length} invitation(s) created and sent successfully`,
    data: {
      invitations,
      count: invitations.length,
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
