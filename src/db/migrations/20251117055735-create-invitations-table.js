'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invitations', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      token: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      role: {
        type: Sequelize.ENUM('student', 'instructor'),
        allowNull: false,
      },
      departmentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'departments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      sectionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'sections',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      program: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      usedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create indexes
    await queryInterface.addIndex('invitations', ['token'], {
      name: 'idx_invitations_token',
    });
    await queryInterface.addIndex('invitations', ['email'], {
      name: 'idx_invitations_email',
    });
    await queryInterface.addIndex('invitations', ['departmentId'], {
      name: 'idx_invitations_departmentId',
    });
    await queryInterface.addIndex('invitations', ['sectionId'], {
      name: 'idx_invitations_sectionId',
    });
    await queryInterface.addIndex('invitations', ['createdBy'], {
      name: 'idx_invitations_createdBy',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('invitations');
  }
};

