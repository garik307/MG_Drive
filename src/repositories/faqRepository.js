const DB = require('../models');
const { Faq } = DB.models;

module.exports = {
  findAll: async () => {
    const items = await Faq.findAll({ order: [['id','DESC']] });
    return items.map(i => i.get({ plain: true }));
  },
  findById: async (id) => Faq.findByPk(id),
  create: async (payload) => Faq.create(payload),
  update: async (id, body) => {
    const faq = await Faq.findByPk(id);
    if (!faq) return null;
    await faq.update(body);
    return faq;
  },
  destroy: async (id) => Faq.destroy({ where: { id } })
};
