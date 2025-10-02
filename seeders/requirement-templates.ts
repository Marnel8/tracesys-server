import colors from "colors";
import RequirementTemplate from "../src/db/models/requirement-template";
import User from "../src/db/models/user";

type SeedItem = {
	title: string;
	description: string;
	category: "health" | "reports" | "training" | "academic" | "evaluation" | "legal";
	priority: "urgent" | "high" | "medium" | "low";
	isRequired: boolean;
	instructions?: string | null;
	allowedFileTypes?: string | null; // CSV in DB
	maxFileSize?: number | null; // MB
	isActive?: boolean;
};

// Map landing categories to model enum
const mapCategory = (label: string): SeedItem["category"] => {
	switch (label.toLowerCase()) {
		case "academic":
			return "academic";
		case "financial":
			return "reports"; // closest fit
		case "character":
			return "evaluation"; // closest fit
		case "health":
			return "health";
		case "legal":
			return "legal";
		case "program":
			return "training"; // closest fit
		case "application":
			return "legal"; // documents/agreements fall under legal
		default:
			return "reports";
	}
};

const rawRequirements = [
	{ number: 1, title: "Registration Form", description: "Registration form that the trainee is currently enrolled", category: "Academic" },
	{ number: 2, title: "Proof of Payment", description: "OJT Fee payment confirmation", category: "Financial" },
	{ number: 3, title: "Validated ID", description: "Validated ID for the Current Semester", category: "Academic" },
	{ number: 4, title: "Evaluation of Grades", description: "Evaluation of Grades from the Registrar / Computation of Grades: GWA", category: "Academic" },
	{ number: 5, title: "Certificate of Good Moral", description: "Certificate of good moral", category: "Character" },
	{ number: 6, title: "Medical Certificate", description: "Medical Certificate that the trainee is physically fit for deployment (CBC with Blood typing, Urinalysis, Chest X-Ray, Fecalysis)", category: "Health" },
	{ number: 7, title: "Community Tax Certificate", description: "Community Tax Certificate (Cedula)", category: "Legal" },
	{ number: 8, title: "Barangay Clearance", description: "Barangay Clearance", category: "Legal" },
	{ number: 9, title: "Police Clearance", description: "Police Clearance", category: "Legal" },
	{ number: 10, title: "Certificate of Attendance", description: "Certificate of attendance at the Pre-Internship Orientation", category: "Program" },
	{ number: 11, title: "Application Letter & Resume", description: "Letter of application and resume", category: "Application" },
	{ number: 12, title: "Parent's Consent", description: "Parent's Consent", category: "Legal" },
	{ number: 13, title: "Memorandum of Agreement", description: "Duly notarized memorandum of agreement with the cooperating agency", category: "Legal" },
];

export const seedRequirementTemplates = async () => {
	console.log(colors.yellow("Starting requirement templates seeding..."));

    // Ensure a system user exists to satisfy createdBy foreign key
    let user = await User.findOne();
    if (!user) {
        console.log(colors.yellow("No users found. Creating a system seeder user..."));
        user = await User.create({
            firstName: "System",
            lastName: "Seeder",
            middleName: "",
            email: "seeder@system.local",
            age: 0,
            phone: "0000000000",
            password: "temporary-password",
            role: "admin",
            gender: "other",
            isActive: true,
            emailVerified: true,
        } as any);
        console.log(colors.green(`✓ Created system user ${user.email}`));
    }

	const seeds: SeedItem[] = rawRequirements.map((r) => ({
		title: r.title,
		description: r.description,
		category: mapCategory(r.category),
		priority: r.title.toLowerCase().includes("medical") || r.category.toLowerCase() === "legal" ? "high" : "medium",
		isRequired: true,
		instructions: null,
    allowedFileTypes: "DOCX",
		maxFileSize: 5,
		isActive: true,
	}));

	let created = 0;
	for (const s of seeds) {
		// Avoid duplicates by title (case-insensitive)
		const existing = await RequirementTemplate.findOne({
			where: { title: s.title },
		});
		if (existing) {
			console.log(colors.blue(`- Skipping existing template: ${s.title}`));
			continue;
		}

		await RequirementTemplate.create({
			...s,
			createdBy: user.id,
		} as any);
		created += 1;
		console.log(colors.green(`✓ Created template: ${s.title}`));
	}

	console.log(colors.green(`\n🎉 Requirement templates seeding complete. Created: ${created}, Skipped: ${seeds.length - created}`));
};

module.exports = { seedRequirementTemplates };


