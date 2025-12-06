'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table already exists
    const [tables] = await queryInterface.sequelize.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'invitations'
    `);

    if (tables && tables.length > 0) {
      console.log('Table invitations already exists, skipping creation');
      return;
    }

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

    // Create indexes (only if they don't exist)
    // Note: token already has a unique constraint which creates an index, so we skip it
    const indexes = [
      { name: 'idx_invitations_email', fields: ['email'] },
      { name: 'idx_invitations_departmentId', fields: ['departmentId'] },
      { name: 'idx_invitations_sectionId', fields: ['sectionId'] },
      { name: 'idx_invitations_createdBy', fields: ['createdBy'] },
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('invitations', index.fields, {
          name: index.name,
        });
      } catch (error) {
        // Index might already exist, ignore the error
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('invitations');
  }
};

