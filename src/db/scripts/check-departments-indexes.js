/**
 * Script to check indexes on the departments table
 * Run with: tsx -r tsconfig-paths/register src/db/scripts/check-departments-indexes.js
 */

const { Sequelize } = require("sequelize");
require("dotenv/config");

const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  dialect: "mysql",
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  logging: false,
});

async function checkDepartmentsIndexes() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database\n");

    // Get all indexes on departments table
    const [indexes] = await sequelize.query(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX,
        INDEX_TYPE
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'departments'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);

    console.log(`Total indexes found: ${indexes.length}\n`);
    
    // Group by index name
    const indexMap = new Map();
    indexes.forEach((idx) => {
      if (!indexMap.has(idx.INDEX_NAME)) {
        indexMap.set(idx.INDEX_NAME, {
          name: idx.INDEX_NAME,
          unique: idx.NON_UNIQUE === 0,
          type: idx.INDEX_TYPE,
          columns: [],
        });
      }
      indexMap.get(idx.INDEX_NAME).columns.push(idx.COLUMN_NAME);
    });

    console.log("Indexes on 'departments' table:");
    console.log("=" .repeat(80));
    
    let uniqueOnCode = false;
    indexMap.forEach((index) => {
      const columns = index.columns.join(", ");
      const uniqueStr = index.unique ? "UNIQUE" : "INDEX";
      console.log(`${index.name.padEnd(40)} ${uniqueStr.padEnd(8)} (${columns})`);
      
      // Check if this is a unique index on 'code'
      if (index.unique && index.columns.includes("code")) {
        uniqueOnCode = true;
      }
    });

    console.log("\n" + "=".repeat(80));
    console.log(`Total unique indexes: ${Array.from(indexMap.values()).filter(i => i.unique).length}`);
    console.log(`Total non-unique indexes: ${Array.from(indexMap.values()).filter(i => !i.unique).length}`);
    
    if (uniqueOnCode) {
      console.log("\n✅ Unique constraint on 'code' column EXISTS");
    } else {
      console.log("\n⚠️  Unique constraint on 'code' column DOES NOT EXIST");
      console.log("   The table has reached MySQL's 64 index limit.");
      console.log("   Consider removing unnecessary indexes to add the unique constraint.");
    }

    await sequelize.close();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkDepartmentsIndexes().catch(console.error);

