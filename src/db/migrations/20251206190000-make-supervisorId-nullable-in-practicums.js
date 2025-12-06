'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, get the foreign key constraint name
    const [foreignKeys] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'practicums' 
      AND COLUMN_NAME = 'supervisorId' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    // Drop the foreign key constraint if it exists
    if (foreignKeys && foreignKeys.length > 0) {
      const constraintName = foreignKeys[0].CONSTRAINT_NAME;
      await queryInterface.sequelize.query(`
        ALTER TABLE \`practicums\` 
        DROP FOREIGN KEY \`${constraintName}\`
      `);
    }

    // Change the column to allow NULL
    await queryInterface.changeColumn('practicums', 'supervisorId', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    // Recreate the foreign key constraint with ON DELETE SET NULL
    await queryInterface.addConstraint('practicums', {
      fields: ['supervisorId'],
      type: 'foreign key',
      name: 'practicums_supervisorId_fkey',
      references: {
        table: 'supervisors',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop the foreign key constraint
    try {
      await queryInterface.removeConstraint('practicums', 'practicums_supervisorId_fkey');
    } catch (error) {
      // Constraint might have a different name, try to find and drop it
      const [foreignKeys] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'practicums' 
        AND COLUMN_NAME = 'supervisorId' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      
      if (foreignKeys && foreignKeys.length > 0) {
        const constraintName = foreignKeys[0].CONSTRAINT_NAME;
        await queryInterface.sequelize.query(`
          ALTER TABLE \`practicums\` 
          DROP FOREIGN KEY \`${constraintName}\`
        `);
      }
    }

    // Change column back to NOT NULL
    // Note: This will fail if there are practicums with null supervisorId
    await queryInterface.changeColumn('practicums', 'supervisorId', {
      type: Sequelize.UUID,
      allowNull: false,
    });

    // Recreate the foreign key constraint (without ON DELETE SET NULL since column is NOT NULL)
    await queryInterface.addConstraint('practicums', {
      fields: ['supervisorId'],
      type: 'foreign key',
      name: 'practicums_supervisorId_fkey',
      references: {
        table: 'supervisors',
        field: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });
  }
};

