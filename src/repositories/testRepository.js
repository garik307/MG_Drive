const DB = require('../models');
const { Test, Question, File } = DB.models;

module.exports = {
  findAllPaged: async ({ limit, offset }) => Test.findAll({
    limit, offset,
    order: [['number','ASC']],
    attributes: ['id','title','number','updatedAt'],
    include: [{
      model: Question,
      as: 'questions',
      where: { table_name: 'tests' },
      attributes: ['id','question'],
      separate: true,
      order: [['id','ASC']],
      limit: 10,
      include: [{
        model: File,
        as: 'files',
        attributes: ['id'],
        separate: true,
        limit: 5
      }]
    }]
  }),
  findAllMetadata: async ({ limit, offset }) => Test.findAll({
    limit, offset,
    attributes: [
        'id', 
        'title', 
        'number',
        [DB.Sequelize.literal('(SELECT COUNT(*) FROM questions WHERE questions.row_id = tests.id AND questions.table_name = "tests")'), 'questionCount']
    ],
    order: [['number', 'ASC']]
  }),
  findAllMetadataAll: async () => Test.findAll({
    attributes: [
        'id', 
        'title', 
        'number',
        'createdAt',
        'updatedAt',
        [DB.Sequelize.literal('(SELECT COUNT(*) FROM questions WHERE questions.row_id = tests.id AND questions.table_name = "tests")'), 'questionCount']
    ],
    order: [['number', 'ASC']]
  }),
  findAllAdmin: async () => Test.findAll({
    order: [['number','ASC']],
    include: [{ 
      model: Question, 
      as: 'questions',
      where: { table_name: 'tests' }
    }]
  }),
  findById: async (id) => Test.findByPk(id, {
    attributes: ['id','title','number','slug'],
    include: [{
      model: Question,
      as: 'questions',
      where: { table_name: 'tests' },
      attributes: ['id','question', 'options', 'correctAnswerIndex', 'number'],
      include: [{ model: File, as: 'files', attributes: ['id','name','ext','name_used'] }]
    }]
  }),
  findByNumber: async (number) => Test.findOne({ where: { number } }),
  create: async (payload) => Test.create(payload),
  update: async (id, body) => {
    const test = await Test.findByPk(id);
    if (!test) return null;
    await test.update(body);
    return test;
  },
  destroyCascade: async (id, t) => {
    const questions = await Question.findAll({ where: { row_id: id, table_name: 'tests' }, transaction: t });
    if (questions.length) {
      const ids = questions.map(q => q.id);
      await File.destroy({ where: { row_id: ids }, transaction: t });
      await Question.destroy({ where: { id: ids }, transaction: t });
    }
    return Test.destroy({ where: { id }, transaction: t });
  }
};
