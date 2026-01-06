const DB = require('../models');
const { Contact } = DB.models;

module.exports = {
  findOne: async () => Contact.findOne(),
  create: async (payload) => Contact.create(payload),
  update: async (instance, payload) => instance.update(payload)
};
