const DB = require('../utils/db');

const connect = DB.con;
const Sequelize = DB.Sequelize;

DB.models = {
  User: require('./user')(connect, Sequelize.DataTypes),
  Test: require('./test')(connect, Sequelize.DataTypes),
  Group: require('./Group')(connect, Sequelize.DataTypes),
  Question: require('./question')(connect, Sequelize.DataTypes),
  Registration: require('./Registration')(connect, Sequelize.DataTypes),
  Review: require('./review')(connect, Sequelize.DataTypes),
  File: require('./file')(connect, Sequelize.DataTypes),
  Contact: require('./contact')(connect, Sequelize.DataTypes),
  Gallery: require('./Gallery')(connect, Sequelize.DataTypes),
  Faq: require('./faq')(connect, Sequelize.DataTypes),
  ContactMessage: require('./contactMessage')(connect, Sequelize.DataTypes),
  TestResult: require('./testResult')(connect, Sequelize.DataTypes),
  GroupProgress: require('./groupProgress')(connect, Sequelize.DataTypes),
}

// User → TestResult
DB.models.User.hasMany(DB.models.TestResult, {
  foreignKey: 'userId',
  as: 'testResults'
});
DB.models.TestResult.belongsTo(DB.models.User, {
  foreignKey: 'userId',
  as: 'user'
});

// Test → TestResult
DB.models.Test.hasMany(DB.models.TestResult, {
  foreignKey: 'testId',
  as: 'results'
});
DB.models.TestResult.belongsTo(DB.models.Test, {
  foreignKey: 'testId',
  as: 'test'
});

// Group → TestResult
DB.models.Group.hasMany(DB.models.TestResult, {
  foreignKey: 'groupId',
  as: 'results'
}); 
DB.models.TestResult.belongsTo(DB.models.Group, {
  foreignKey: 'groupId',
  as: 'group'
});

// User → GroupProgress
DB.models.User.hasMany(DB.models.GroupProgress, {
  foreignKey: 'userId',
  as: 'groupProgress'
});
DB.models.GroupProgress.belongsTo(DB.models.User, {
  foreignKey: 'userId',
  as: 'user'
});

// Group → GroupProgress
DB.models.Group.hasMany(DB.models.GroupProgress, {
  foreignKey: 'groupId',
  as: 'progress'
});
DB.models.GroupProgress.belongsTo(DB.models.Group, {
  foreignKey: 'groupId',
  as: 'group'
});

// User → Files
DB.models.User.hasMany(DB.models.File, {
  foreignKey: 'row_id',
  sourceKey: 'id', 
  as: 'files',
  constraints: false,
  scope: {
    name_used: 'user_img'
  }
});

// File → User
DB.models.File.belongsTo(DB.models.User, {
  foreignKey: 'row_id',
  targetKey: 'id', 
  as: 'user',
  constraints: false,
  scope: {
    name_used: 'user_img'
  }
});

DB.models.Test.hasMany(DB.models.Question, {
  foreignKey: 'row_id',
  as: 'questions',
  constraints: false,
  scope: {
    table_name: 'tests'
  }
});

DB.models.Question.belongsTo(DB.models.Test, {
  foreignKey: 'row_id',
  as: 'test',
  constraints: false
});

DB.models.Group.hasMany(DB.models.Question, {
  foreignKey: 'row_id',
  as: 'questions',
  constraints: false,
  scope: {
    table_name: 'groups'
  }
});

DB.models.Question.belongsTo(DB.models.Group, {
  foreignKey: 'row_id',
  as: 'group',
  constraints: false
});

DB.models.Question.hasMany(DB.models.File, {
  foreignKey: 'row_id',
  as: 'files',
  constraints: false,
});
DB.models.File.belongsTo(DB.models.Question, {
  foreignKey: 'row_id',
  as: 'question',
  constraints: false
});

// Gallery ↔ Files
DB.models.Gallery.hasMany(DB.models.File, {
  foreignKey: 'row_id',
  as: 'files',
  constraints: false,
  scope: {
    table_name: 'gallery'
  }
});
DB.models.File.belongsTo(DB.models.Gallery, {
  foreignKey: 'row_id',
  as: 'gallery',
  constraints: false
});

// User ↔ Reviews
DB.models.User.hasMany(DB.models.Review, {
  foreignKey: 'user_id',
  as: 'reviews'
});
DB.models.Review.belongsTo(DB.models.User, {
  foreignKey: 'user_id',
  as: 'user'
});

module.exports = DB;
