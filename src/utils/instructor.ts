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


