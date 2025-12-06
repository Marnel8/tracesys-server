'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column already exists
    const [columns] = await queryInterface.sequelize.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'provider'
    `);

    if (columns && columns.length > 0) {
      console.log('Column provider already exists in users table, skipping');
      return;
    }

    await queryInterface.addColumn('users', 'provider', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Check if column exists before removing
    const [columns] = await queryInterface.sequelize.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'provider'
    `);

    if (columns && columns.length > 0) {
      await queryInterface.removeColumn('users', 'provider');
    }
  }
};

