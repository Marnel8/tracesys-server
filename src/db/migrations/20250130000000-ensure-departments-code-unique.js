'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if the unique constraint/index already exists on departments.code
    const [indexes] = await queryInterface.sequelize.query(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'departments'
        AND COLUMN_NAME = 'code'
        AND NON_UNIQUE = 0
    `);

    // If unique index doesn't exist, try to add it
    if (!indexes || indexes.length === 0) {
      try {
        // First, check total number of indexes
        const [allIndexes] = await queryInterface.sequelize.query(`
          SELECT COUNT(DISTINCT INDEX_NAME) as index_count
          FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'departments'
        `);

        const indexCount = allIndexes[0]?.index_count || 0;
        
        if (indexCount >= 64) {
          console.warn(
            `Warning: departments table already has ${indexCount} indexes (MySQL limit: 64). ` +
            `Cannot add unique constraint on 'code' column. ` +
            `Please remove unnecessary indexes or ensure the constraint already exists manually.`
          );
          return;
        }

        // Try to add unique constraint
        await queryInterface.addIndex('departments', ['code'], {
          unique: true,
          name: 'departments_code_unique',
        });
        console.log('Successfully added unique constraint on departments.code');
      } catch (error) {
        if (error.original?.code === 'ER_TOO_MANY_KEYS' || error.original?.errno === 1069) {
          console.warn(
            'Warning: Cannot add unique constraint on departments.code - too many indexes. ' +
            'The constraint may already exist or the table has reached MySQL\'s 64 index limit.'
          );
        } else {
          throw error;
        }
      }
    } else {
      console.log('Unique constraint on departments.code already exists');
    }
  },

  async down(queryInterface, Sequelize) {
    // Check if the unique index exists before trying to remove it
    const [indexes] = await queryInterface.sequelize.query(`
      SELECT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'departments'
        AND COLUMN_NAME = 'code'
        AND NON_UNIQUE = 0
    `);

    if (indexes && indexes.length > 0) {
      try {
        await queryInterface.removeIndex('departments', 'departments_code_unique');
      } catch (error) {
        // Index might have a different name, try to find and remove it
        const indexName = indexes[0]?.INDEX_NAME;
        if (indexName) {
          await queryInterface.removeIndex('departments', indexName);
        }
      }
    }
  }
};





