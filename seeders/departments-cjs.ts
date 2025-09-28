import "dotenv/config";
import sequelize from "../src/db";
import Department from "../src/db/models/department";
import colors from "colors";

const seedDepartments = async () => {
	try {
		console.log(colors.yellow("Starting department seeding..."));

		// Define the departments to seed
		const departments = [
			{
				name: "College of Arts, Science, and Technology (CAST)",
				code: "CAST",
				description: "The College of Arts, Science, and Technology provides comprehensive education in arts, sciences, and technology fields, preparing students for careers in various industries.",
				color: "#3B82F6", // Blue
				icon: "graduation-cap",
				isActive: true,
			},
			{
				name: "College of Teachers in Education (CTE)",
				code: "CTE",
				description: "The College of Teachers in Education focuses on preparing future educators and teachers through comprehensive teacher education programs.",
				color: "#10B981", // Green
				icon: "book-open",
				isActive: true,
			},
			{
				name: "College of Business Administration and Management",
				code: "CBAM",
				description: "The College of Business Administration and Management offers programs in business, management, and administration to prepare students for leadership roles in the corporate world.",
				color: "#F59E0B", // Amber
				icon: "briefcase",
				isActive: true,
			},
		];

		// Check if departments already exist
		const existingDepartments = await Department.findAll();
		
		if (existingDepartments.length > 0) {
			console.log(colors.yellow("Departments already exist. Skipping seeding to avoid duplicates."));
			console.log(colors.blue(`Found ${existingDepartments.length} existing departments:`));
			existingDepartments.forEach(dept => {
				console.log(colors.cyan(`- ${dept.name} (${dept.code})`));
			});
			return;
		}

		// Create departments
		for (const deptData of departments) {
			const department = await Department.create(deptData);
			console.log(colors.green(`✓ Created department: ${department.name} (${department.code})`));
		}

		console.log(colors.green(`\n🎉 Successfully seeded ${departments.length} departments!`));
	} catch (error) {
		console.error(colors.red("Error seeding departments:"), error);
		throw error;
	}
};

const runSeeders = async () => {
	try {
		// Test database connection
		await sequelize.authenticate();
		console.log(colors.green("Connected to database successfully"));

		// Run all seeders
		await seedDepartments();

		console.log(colors.green("\n✅ All seeders completed successfully!"));
	} catch (error) {
		console.error(colors.red("❌ Seeding failed:"), error);
		process.exit(1);
	} finally {
		try {
			await sequelize.close();
			console.log(colors.blue("Database connection closed"));
		} catch (closeError) {
			console.error(colors.yellow("Warning: Error closing database connection:"), closeError);
		}
	}
};

// Run seeders if this file is executed directly
// Check if this file is being run directly (simplified check)
const isMainModule = process.argv[1] && process.argv[1].endsWith('departments-cjs.ts');

if (isMainModule) {
	// Add timeout to prevent hanging
	const timeout = setTimeout(() => {
		console.error(colors.red("❌ Seeding timed out after 30 seconds"));
		process.exit(1);
	}, 30000);

	runSeeders()
		.then(() => {
			clearTimeout(timeout);
		})
		.catch((error) => {
			clearTimeout(timeout);
			console.error(colors.red("❌ Seeding failed:"), error);
			process.exit(1);
		});
}

// ES module exports
export { runSeeders, seedDepartments };
