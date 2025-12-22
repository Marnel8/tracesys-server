'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column already exists
    const [columns] = await queryInterface.sequelize.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'requirements' 
      AND COLUMN_NAME = 'isActive'
    `);

    if (columns && columns.length > 0) {
      console.log('Column isActive already exists in requirements table, skipping');
      return;
    }

    // Add isActive column with default value true for existing records
    await queryInterface.addColumn('requirements', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Check if column exists before removing
    const [columns] = await queryInterface.sequelize.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'requirements' 
      AND COLUMN_NAME = 'isActive'
    `);

    if (columns && columns.length > 0) {
      await queryInterface.removeColumn('requirements', 'isActive');
    }
  }
};

