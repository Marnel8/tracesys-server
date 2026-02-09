'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if the column already exists
    const [columns] = await queryInterface.sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'attendance_records'
        AND COLUMN_NAME = 'undertimeHours'
    `);

    if (columns && columns.length > 0) {
      console.log('Column undertimeHours already exists in attendance_records table');
      return;
    }

    // Add the column
    await queryInterface.addColumn('attendance_records', 'undertimeHours', {
      type: Sequelize.FLOAT,
      allowNull: true,
      after: 'hours', // Place it after the hours column
    });

    console.log('Successfully added undertimeHours column to attendance_records table');
  },

  async down(queryInterface, Sequelize) {
    // Check if the column exists before trying to remove it
    const [columns] = await queryInterface.sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'attendance_records'
        AND COLUMN_NAME = 'undertimeHours'
    `);

    if (columns && columns.length > 0) {
      await queryInterface.removeColumn('attendance_records', 'undertimeHours');
      console.log('Successfully removed undertimeHours column from attendance_records table');
    }
  }
};






