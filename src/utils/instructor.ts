import StudentEnrollment from "@/db/models/student-enrollment";
import Section from "@/db/models/section";

// Returns true if the given student is under the instructor's supervision via any section
export async function instructorOwnsStudent(instructorId: string, studentId: string): Promise<boolean> {
	const enrollment = await StudentEnrollment.findOne({
		where: { studentId },
		include: [
			{
				model: Section,
				as: "section" as any,
				attributes: ["id"],
				required: true,
				where: { instructorId },
			},
		],
	});
	return !!enrollment;
}

// Get all student IDs under an instructor's supervision
export async function getInstructorStudentIds(instructorId: string): Promise<string[]> {
	try {
		const enrollments = await StudentEnrollment.findAll({
			attributes: ["studentId"],
			include: [
				{
					model: Section,
					as: "section" as any,
					attributes: [],
					required: true,
					where: { instructorId },
				},
			],
		});

		return enrollments.map((enrollment) => enrollment.studentId).filter(Boolean);
	} catch (error) {
		console.error("Error fetching instructor student IDs:", error);
		return [];
	}
}


