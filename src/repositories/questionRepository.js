const DB = require('../models');
const { Question, File, Test, Group } = DB.models;
const { Op } = DB.Sequelize;

module.exports = {
  create: async (body, t) => {
    let options;
    try { options = typeof body.options === 'string' ? JSON.parse(body.options) : body.options; } catch { options = []; }
    const payload = {
      row_id: body.row_id,
      table_name: body.table_name,
      question: body.question,
      correctAnswerIndex: body.correctAnswerIndex,
      number: body.number || 0,
      options
    };
    return Question.create(payload, { transaction: t });
  },

  findByIdWithFiles: async (id) => Question.findByPk(id, {
    include: [{ model: File, as: 'files', attributes: ['id','name','ext','name_used'] }]
  }),

  save: async (question) => question.save(),

  findFileByRowId: async (rowId) => File.findOne({ where: { row_id: rowId } }),
  destroyById: async (id) => Question.destroy({ where: { id } }),
  destroyFileById: async (id) => File.destroy({ where: { id } }),

  findAllBasic: async () => Question.findAll({
    attributes: ['id','question','options','row_id','table_name','correctAnswerIndex','number']
  }),

  findAllTests: async () => Test.findAll({ attributes: ['id','title','number'] }),
  findAllGroups: async () => Group.findAll({ attributes: ['id','title','number'] })
  ,
  findFilesByRowIds: async (ids) => File.findAll({
    where: { table_name: 'questions', row_id: { [Op.in]: ids } },
    attributes: ['id','row_id','table_name','name','ext','name_used']
  })
  ,
  getMaxNumberByOwner: async (table_name, row_id) => {
    const res = await Question.findOne({
      where: { table_name, row_id },
      attributes: [[DB.Sequelize.fn('MAX', DB.Sequelize.col('number')), 'maxNumber']],
      raw: true
    });
    const val = res && res.maxNumber != null ? parseInt(res.maxNumber, 10) : 0;
    return Number.isNaN(val) ? 0 : val;
  }
};

