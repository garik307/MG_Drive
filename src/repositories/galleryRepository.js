const DB = require('../models');
const dbCon = require('../utils/db');

const { Gallery, File } = DB.models;
const sequelize = dbCon.con;

module.exports = {
  sequelize,
  findAll: async () => {
    const items = await Gallery.findAll({
      include: [{ association: 'files' }],
      order: [['id', 'DESC']]
    });
    return items.map(i => i.get({ plain: true }));
  },
  findById: async (id, t) => Gallery.findByPk(id, { include: [{ association: 'files' }], transaction: t }),
  create: async (payload, t) => Gallery.create(payload, { transaction: t }),
  save: async (instance, t) => instance.save({ transaction: t }),
  destroyById: async (id, t) => {
    const item = await Gallery.findByPk(id, { transaction: t });
    if (!item) return false;
    await item.destroy({ transaction: t });
    return true;
  },
  findFilesForRow: async (rowId, t) => File.findAll({ where: { row_id: rowId, table_name: 'gallery' }, transaction: t }),
  destroyFilesByIds: async (ids, t) => File.destroy({ where: { id: ids }, transaction: t })
};
