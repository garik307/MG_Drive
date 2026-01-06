const DB = require('../models');
const { User, File } = DB.models;

module.exports = {
  findAll: async ({ where = {} } = {}) => User.findAll({ where, include: 'files' }),
  findAndCountAll: async (options) => User.findAndCountAll(options),
  count: async (options) => User.count(options),
  findById: async (id) => User.findByPk(id, { include: 'files' }),
  save: async (user) => user.save(),
  findAvatarFileForUser: async (userId) => File.findOne({ where: { row_id: userId, name_used: 'user_img' } }),
  destroyFileById: async (id) => File.destroy({ where: { id }, individualHooks: true })
};
