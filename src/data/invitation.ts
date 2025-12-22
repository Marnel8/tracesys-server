import sequelize from "@/db";
import Invitation from "@/db/models/invitation";
import User from "@/db/models/user";
import StudentEnrollment from "@/db/models/student-enrollment";
import Requirement from "@/db/models/requirement";
import Report from "@/db/models/report";
import ReportView from "@/db/models/report-view";
import AttendanceRecord from "@/db/models/attendance-record";
import Practicum from "@/db/models/practicum";
import Announcement from "@/db/models/announcement";
import Achievement from "@/db/models/achievement";
import FileAttachment from "@/db/models/file-attachment";
import RequirementComment from "@/db/models/requirement-comment";
import AnnouncementComment from "@/db/models/announcement-comment";
import Section from "@/db/models/section";
import Department from "@/db/models/department";
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

	// Check if user already exists in the database
	const existingUser = await User.findOne({
		where: { email },
	});

	if (existingUser) {
		throw new ConflictError("A user with this email already exists in the system.");
	}

	// Check if invitation was already used (usedAt is not null)
	const usedInvitation = await Invitation.findOne({
		where: {
			email,
			role,
			usedAt: { [Op.ne]: null },
		},
	});

	if (usedInvitation) {
		throw new ConflictError("An invitation for this email has already been used.");
	}

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
				// Check if user already exists in the database
				const existingUser = await User.findOne({
					where: { email },
					transaction: t,
				});

				if (existingUser) {
					errors.push(`${email}: User already exists in the system`);
					continue;
				}

				// Check if invitation was already used (usedAt is not null)
				const usedInvitation = await Invitation.findOne({
					where: {
						email,
						role,
						usedAt: { [Op.ne]: null },
					},
					transaction: t,
				});

				if (usedInvitation) {
					errors.push(`${email}: Invitation already used`);
					continue;
				}

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
	const t = await sequelize.transaction();

	try {
		const invitation = await Invitation.findOne({
			where: {
				id: invitationId,
				createdBy: instructorId,
			},
			transaction: t,
		});

		if (!invitation) {
			await t.rollback();
			throw new NotFoundError("Invitation not found or you don't have permission to delete it.");
		}

		// If invitation was used, delete the associated user account
		if (invitation.usedAt) {
			const user = await User.findOne({
				where: {
					email: invitation.email,
					role: invitation.role,
				},
				transaction: t,
			});

			if (user) {
				// Delete student-related records
				if (invitation.role === "student") {
					// Delete student enrollments
					await StudentEnrollment.destroy({
						where: { studentId: user.id },
						transaction: t,
					});

					// Delete requirements and their comments
					const requirementIds = await Requirement.findAll({
						where: { studentId: user.id },
						attributes: ["id"],
						transaction: t,
					});
					if (requirementIds.length > 0) {
						await RequirementComment.destroy({
							where: {
								requirementId: { [Op.in]: requirementIds.map((r) => r.id) },
							},
							transaction: t,
						});
					}
					await Requirement.destroy({
						where: { studentId: user.id },
						transaction: t,
					});

					// Delete reports (clear report views first to satisfy FK constraint)
					const reportIds = await Report.findAll({
						where: { studentId: user.id },
						attributes: ["id"],
						transaction: t,
					});

					if (reportIds.length > 0) {
						await ReportView.destroy({
							where: { reportId: { [Op.in]: reportIds.map((r) => r.id) } },
							transaction: t,
						});
					}

					// Delete reports
					await Report.destroy({
						where: { studentId: user.id },
						transaction: t,
					});

					// Delete attendance records
					await AttendanceRecord.destroy({
						where: { studentId: user.id },
						transaction: t,
					});

					// Delete practicums
					await Practicum.destroy({
						where: { studentId: user.id },
						transaction: t,
					});

					// Delete achievements where user is the student
					await Achievement.destroy({
						where: { studentId: user.id },
						transaction: t,
					});
				}

				// Delete instructor-related records
				if (invitation.role === "instructor") {
					// Set NULL for sections where user is instructor
					await Section.update(
						{ instructorId: null },
						{ where: { instructorId: user.id }, transaction: t }
					);

					// Set NULL for departments where user is head
					await Department.update(
						{ headId: null },
						{ where: { headId: user.id }, transaction: t }
					);

					// Delete announcements authored by user
					const announcementIds = await Announcement.findAll({
						where: { authorId: user.id },
						attributes: ["id"],
						transaction: t,
					});
					if (announcementIds.length > 0) {
						await AnnouncementComment.destroy({
							where: {
								announcementId: { [Op.in]: announcementIds.map((a) => a.id) },
							},
							transaction: t,
						});
					}
					await Announcement.destroy({
						where: { authorId: user.id },
						transaction: t,
					});
				}

				// Delete records that apply to both roles
				// Delete file attachments
				await FileAttachment.destroy({
					where: { uploadedBy: user.id },
					transaction: t,
				});

				// Set NULL for approvedBy fields in requirements
				await Requirement.update(
					{ approvedBy: null },
					{ where: { approvedBy: user.id }, transaction: t }
				);

				// Set NULL for approvedBy fields in reports
				await Report.update(
					{ approvedBy: null },
					{ where: { approvedBy: user.id }, transaction: t }
				);

				// Set NULL for approvedBy fields in attendance records
				await AttendanceRecord.update(
					{ approvedBy: null },
					{ where: { approvedBy: user.id }, transaction: t }
				);

				// Set NULL for awardedBy fields in achievements
				await Achievement.update(
					{ awardedBy: null },
					{ where: { awardedBy: user.id }, transaction: t }
				);

				// Delete comments by user
				await RequirementComment.destroy({
					where: { userId: user.id },
					transaction: t,
				});

				await AnnouncementComment.destroy({
					where: { userId: user.id },
					transaction: t,
				});

				// Delete the user account
				await user.destroy({ transaction: t });
			}
		}

		// Delete the invitation
		await invitation.destroy({ transaction: t });

		await t.commit();
	} catch (error) {
		await t.rollback();
		throw error;
	}
};

export const getInvitationByToken = async (token: string): Promise<Invitation | null> => {
	return await Invitation.findOne({
		where: { token },
		include: ["department", "section", "creator"],
	});
};

