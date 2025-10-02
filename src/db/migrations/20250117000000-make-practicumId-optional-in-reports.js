'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('reports', 'practicumId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('reports', 'practicumId', {
      type: Sequelize.UUID,
      allowNull: false,
    });
  }
};
