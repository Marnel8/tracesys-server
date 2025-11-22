import sequelize from "@/db";
import Invitation from "@/db/models/invitation";
import { BadRequestError, NotFoundError, ConflictError } from "@/utils/error";
import { Op } from "sequelize";
import crypto from "crypto";

interface CreateInvitationParams {
	email: string;
	role: "student" | "instructor";
	departmentId?: string;
	sectionId?: string;
	program?: string;
	createdBy: string;
	expiresInDays?: number;
}

interface BulkInvitationParams {
	emails: string[];
	role: "student" | "instructor";
	departmentId?: string;
	sectionId?: string;
	program?: string;
	createdBy: string;
	expiresInDays?: number;
}

export const createInvitation = async (params: CreateInvitationParams): Promise<Invitation> => {
	const { email, role, departmentId, sectionId, program, createdBy, expiresInDays = 7 } = params;

	// Check if invitation already exists for this email and is not used
	const existingInvitation = await Invitation.findOne({
		where: {
			email,
			role,
			usedAt: null,
		},
	});

	if (existingInvitation && !existingInvitation.isExpired()) {
		throw new ConflictError("An active invitation already exists for this email.");
	}

	// Generate secure random token
	const token = crypto.randomBytes(32).toString("hex");

	// Calculate expiration date
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + expiresInDays);

	const invitation = await Invitation.create({
		token,
		email,
		role,
		departmentId: departmentId || null,
		sectionId: sectionId || null,
		program: program || null,
		expiresAt,
		createdBy,
	});

	return invitation;
};

export const createBulkInvitations = async (params: BulkInvitationParams): Promise<Invitation[]> => {
	const { emails, role, departmentId, sectionId, program, createdBy, expiresInDays = 7 } = params;

	if (!emails || emails.length === 0) {
		throw new BadRequestError("At least one email address is required.");
	}

	// Validate all emails
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const invalidEmails = emails.filter((email) => !emailRegex.test(email));
	if (invalidEmails.length > 0) {
		throw new BadRequestError(`Invalid email addresses: ${invalidEmails.join(", ")}`);
	}

	const invitations: Invitation[] = [];
	const errors: string[] = [];

	// Create invitations in a transaction
	const t = await sequelize.transaction();

	try {
		for (const email of emails) {
			try {
				// Check if active invitation exists
				const existingInvitation = await Invitation.findOne({
					where: {
						email,
						role,
						usedAt: null,
					},
					transaction: t,
				});

				if (existingInvitation && !existingInvitation.isExpired()) {
					errors.push(`${email}: Active invitation already exists`);
					continue;
				}

				// Generate secure random token
				const token = crypto.randomBytes(32).toString("hex");

				// Calculate expiration date
				const expiresAt = new Date();
				expiresAt.setDate(expiresAt.getDate() + expiresInDays);

				const invitation = await Invitation.create(
					{
						token,
						email,
						role,
						departmentId: departmentId || null,
						sectionId: sectionId || null,
						program: program || null,
						expiresAt,
						createdBy,
					},
					{ transaction: t }
				);

				invitations.push(invitation);
			} catch (error: any) {
				errors.push(`${email}: ${error.message}`);
			}
		}

		await t.commit();

		if (errors.length > 0 && invitations.length === 0) {
			throw new BadRequestError(`Failed to create invitations: ${errors.join("; ")}`);
		}

		return invitations;
	} catch (error) {
		await t.rollback();
		throw error;
	}
};

export const validateInvitationToken = async (token: string): Promise<Invitation> => {
	const invitation = await Invitation.findOne({
		where: { token },
		include: ["department", "section", "creator"],
	});

	if (!invitation) {
		throw new NotFoundError("Invitation not found.");
	}

	if (invitation.isExpired()) {
		throw new BadRequestError("Invitation has expired.");
	}

	if (invitation.isUsed()) {
		throw new BadRequestError("Invitation has already been used.");
	}

	return invitation;
};

export const markInvitationAsUsed = async (token: string): Promise<Invitation> => {
	const invitation = await Invitation.findOne({
		where: { token },
	});

	if (!invitation) {
		throw new NotFoundError("Invitation not found.");
	}

	invitation.usedAt = new Date();
	await invitation.save();

	return invitation;
};

export const getInvitationsByInstructor = async (
	instructorId: string,
	options?: {
		status?: "pending" | "used" | "expired" | "all";
		limit?: number;
		offset?: number;
		search?: string;
	}
): Promise<{ invitations: Invitation[]; total: number }> => {
	const { status = "all", limit = 50, offset = 0, search } = options || {};

	const whereClause: any = {
		createdBy: instructorId,
	};

	if (search) {
		whereClause.email = {
			[Op.like]: `%${search}%`,
		};
	}

	if (status !== "all") {
		if (status === "pending") {
			whereClause.usedAt = null;
			whereClause.expiresAt = {
				[Op.gt]: new Date(),
			};
		} else if (status === "used") {
			whereClause.usedAt = {
				[Op.ne]: null,
			};
		} else if (status === "expired") {
			whereClause.expiresAt = {
				[Op.lt]: new Date(),
			};
			whereClause.usedAt = null;
		}
	}

	const { count, rows } = await Invitation.findAndCountAll({
		where: whereClause,
		include: ["department", "section"],
		order: [["createdAt", "DESC"]],
		limit,
		offset,
	});

	return {
		invitations: rows,
		total: count,
	};
};

export const deleteInvitation = async (invitationId: string, instructorId: string): Promise<void> => {
	const invitation = await Invitation.findOne({
		where: {
			id: invitationId,
			createdBy: instructorId,
		},
	});

	if (!invitation) {
		throw new NotFoundError("Invitation not found or you don't have permission to delete it.");
	}

	if (invitation.isUsed()) {
		throw new BadRequestError("Cannot delete an invitation that has already been used.");
	}

	await invitation.destroy();
};

export const getInvitationByToken = async (token: string): Promise<Invitation | null> => {
	return await Invitation.findOne({
		where: { token },
		include: ["department", "section", "creator"],
	});
};

