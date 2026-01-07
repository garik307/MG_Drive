const DB = require('../models');
const {
    Group,
    Question,
    File
} = DB.models;

module.exports = {
    findAndCountAllPaged: async ({
        limit,
        offset
    }) => Group.findAndCountAll({
        limit,
        offset,
        distinct: true,
        order: [
            ['number', 'ASC']
        ],
        attributes: ['id', 'title', 'number', 'slug', 'date'],
        include: [{
            model: Question,
            as: 'questions',
            attributes: ['id', 'question'],
            separate: true,
            order: [
                ['id', 'ASC']
            ],
            include: [{
                model: File,
                as: 'files',
                attributes: ['id', 'name', 'ext', 'name_used'],
                separate: true
            }]
        }]
    }),
    findAllPaged: async ({
        limit,
        offset
    }) => Group.findAll({
        limit,
        offset,
        order: [
            ['number', 'ASC']
        ],
        attributes: ['id', 'title', 'number', 'slug', 'date'],
        include: [{
            model: Question,
            as: 'questions',
            attributes: ['id', 'question'],
            separate: true,
            order: [
                ['id', 'ASC']
            ],
            include: [{
                model: File,
                as: 'files',
                attributes: ['id', 'name', 'ext', 'name_used'],
                separate: true
            }]
        }]
    }),
    findAllAdmin: async () => Group.findAll({
        order: [
            ['number', 'ASC']
        ],
        include: [{
            model: Question,
            as: 'questions'
        }]
    }),
    findAllMetadataAll: async () => Group.findAll({
        attributes: [
            'id', 
            'title', 
            'number',
            'text',
            'createdAt',
            'updatedAt',
            [DB.Sequelize.literal('(SELECT COUNT(*) FROM questions WHERE questions.row_id = groups.id AND questions.table_name = "groups")'), 'questionCount']
        ],
        order: [['number', 'ASC']]
    }),
    findById: async (id) => Group.findByPk(id, {
        attributes: ['id', 'title', 'number', 'slug', 'date'],
        include: [{
            model: Question,
            as: 'questions',
            attributes: ['id', 'title', 'question'],
            include: [{
                model: File,
                as: 'files',
                attributes: ['id', 'name', 'ext', 'name_used']
            }]
        }]
    }),
    findByNumber: async (number) => Group.findOne({
        where: {
            number
        }
    }),
    create: async (payload) => Group.create(payload),
    update: async (id, body) => {
        const group = await Group.findByPk(id);
        if (!group) return null;
        await group.update(body);
        return group;
    },
    destroyCascade: async (id, t) => {
        const questions = await Question.findAll({
            where: {
                row_id: id,
                table_name: 'groups'
            },
            transaction: t
        });
        if (questions.length) {
            const ids = questions.map(q => q.id);
            await File.destroy({
                where: {
                    row_id: ids
                },
                transaction: t
            });
            await Question.destroy({
                where: {
                    id: ids
                },
                transaction: t
            });
        }
        return Group.destroy({
            where: {
                id
            },
            transaction: t
        });
    },
    findQuestionsPaged: async ({ groupId, limit, offset }) => {
        return Question.findAndCountAll({
            where: {
                table_name: 'groups',
                row_id: groupId
            },
            limit,
            offset,
            order: [['id', 'ASC']],
            include: [{
                model: File,
                as: 'files',
                attributes: ['id', 'name', 'ext', 'name_used']
            }]
        });
    }
};