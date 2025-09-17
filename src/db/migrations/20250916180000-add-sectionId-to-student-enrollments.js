'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add sectionId column if it doesn't exist
    const table = 'student_enrollments';
    const column = 'sectionId';

    const [results] = await queryInterface.sequelize.query(
      "SHOW COLUMNS FROM `student_enrollments` LIKE 'sectionId';"
    );

    if (!results || results.length === 0) {
      await queryInterface.addColumn(table, column, {
        type: Sequelize.UUID,
        allowNull: false,
      });

      // Add foreign key constraint to sections(id)
      await queryInterface.addConstraint(table, {
        fields: [column],
        type: 'foreign key',
        name: 'fk_student_enrollments_sectionId_sections_id',
        references: {
          table: 'sections',
          field: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'student_enrollments';
    const column = 'sectionId';

    // Remove constraint if exists
    try {
      await queryInterface.removeConstraint(
        table,
        'fk_student_enrollments_sectionId_sections_id'
      );
    } catch (e) {
      // ignore if not exists
    }

    // Remove column if exists
    const [results] = await queryInterface.sequelize.query(
      "SHOW COLUMNS FROM `student_enrollments` LIKE 'sectionId';"
    );
    if (results && results.length > 0) {
      await queryInterface.removeColumn(table, column);
    }
  },
};
