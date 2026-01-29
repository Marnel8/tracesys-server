'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add createdByInstructorId column to supervisors table
    await queryInterface.addColumn('supervisors', 'createdByInstructorId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    // Set existing supervisors' createdByInstructorId to the agency's instructorId if available
    await queryInterface.sequelize.query(`
      UPDATE supervisors s
      INNER JOIN agencies a ON s.agencyId = a.id
      SET s.createdByInstructorId = a.instructorId
      WHERE a.instructorId IS NOT NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove the foreign key constraint first
    try {
      const [foreignKeys] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'supervisors' 
        AND COLUMN_NAME = 'createdByInstructorId' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      
      if (foreignKeys && foreignKeys.length > 0) {
        const constraintName = foreignKeys[0].CONSTRAINT_NAME;
        await queryInterface.sequelize.query(`
          ALTER TABLE \`supervisors\` 
          DROP FOREIGN KEY \`${constraintName}\`
        `);
      }
    } catch (error) {
      // Constraint might not exist, continue
    }

    // Remove the column
    await queryInterface.removeColumn('supervisors', 'createdByInstructorId');
  }
};

