'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'avatar', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert to VARCHAR(255) - note: this may truncate long URLs
    await queryInterface.changeColumn('users', 'avatar', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  }
};

