# Database Seeders

This directory contains database seeders for the TraceSys application.

## Available Seeders

### Department Seeder
Seeds the database with the following departments:
- College of Arts, Science, and Technology (CAST)
- College of Teachers in Education (CTE)
- College of Business Administration and Management (CBAM)

## Usage

### Run All Seeders
```bash
pnpm run seed
```

### Run Department Seeder Only
```bash
pnpm run seed:departments
```

## Features

- **Duplicate Prevention**: The seeder checks if departments already exist before creating new ones
- **Color Coding**: Each department has a unique color for UI purposes
- **Icons**: Each department has an associated icon
- **Descriptions**: Detailed descriptions for each department
- **Safe Execution**: Uses database transactions for data integrity

## Department Details

| Department | Code | Color | Icon | Description |
|------------|------|-------|------|-------------|
| College of Arts, Science, and Technology | CAST | Blue (#3B82F6) | graduation-cap | Comprehensive education in arts, sciences, and technology |
| College of Teachers in Education | CTE | Green (#10B981) | book-open | Teacher education programs |
| College of Business Administration and Management | CBAM | Amber (#F59E0B) | briefcase | Business, management, and administration programs |

## Notes

- The seeder will skip execution if departments already exist to prevent duplicates
- All departments are created with `isActive: true` by default
- The seeder uses the existing database connection from the main application
