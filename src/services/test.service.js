const cache = require('../utils/cache');
const AppError = require('../utils/appError');
const dbCon = require('../utils/db');
const repo = require('../repositories/testRepository');
const {
    TESTS_PAGE_PREFIX
} = require('../constants/cache');
const {
    TestResult
} = dbCon.models;

async function listPaged(page = 1, limit = 20) {
    const key = `${TESTS_PAGE_PREFIX}:page=${page}:limit=${limit}`;
    const cached = await cache.get(key);
    if (cached) return {
        tests: cached,
        fromCache: true
    };
    const offset = (page - 1) * limit;
    const rows = await repo.findAllPaged({
        limit,
        offset
    });
    const tests = rows.map(r => r.get({
        plain: true
    }));
    await cache.set(key, tests, 20);
    return {
        tests,
        fromCache: false
    };
}

async function listMetadata(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await repo.findAllMetadata({
        limit,
        offset
    });
    return rows.map(r => {
        const plain = r.get({
            plain: true
        });
        return {
            id: plain.id,
            title: plain.title,
            questionCount: parseInt(plain.questionCount || 0, 10),
            timeLimit: 20
        };
    });
}

async function listAllMetadata() {
    const key = 'tests:all:metadata';
    const cached = await cache.get(key);
    if (cached) return cached;

    const rows = await repo.findAllMetadataAll();
    const tests = rows.map(r => {
        const plain = r.get({
            plain: true
        });
        return {
            id: plain.id,
            title: plain.title,
            number: plain.number,
            questionCount: parseInt(plain.questionCount || 0, 10),
            createdAt: plain.createdAt,
            updatedAt: plain.updatedAt,
            timeLimit: 20 // Default
        };
    });

    await cache.set(key, tests, 3600); // Cache for 1 hour
    return tests;
}

async function listAdmin() {
    return repo.findAllAdmin();
}

async function getById(id) {
    const test = await repo.findById(id);
    if (!test) throw new AppError('Թեստը չի գտնվել', 404);

    // Consistency Logic with Admin Panel
    if (test.questions && test.questions.length > 0) {
        const hasNumbers = test.questions.every(q => (Number(q.number) || 0) > 0);
        if (!hasNumbers) {
            test.questions.sort((a, b) => a.id - b.id);
            test.questions.forEach((q, idx) => {
                q.number = idx + 1;
            });
        }
    }
    
    return test;
}

async function create(body) {
    const title = String(body.title || '').trim();
    const num = Number(body.number || (title.match(/\d+/) ?. [0] || 0));
    if (num > 0) {
        const existing = await repo.findByNumber(num);
        if (existing) throw new AppError('Այս համարով թեստ արդեն ավելացված է', 409);
    }
    const test = await repo.create(body);
    return test;
}

async function update(id, body) {
    const test = await repo.update(id, body);
    if (!test) throw new AppError('Test not found', 404);
    return test;
}

async function remove(id) {
    const t = await dbCon.con.transaction();
    try {
        const deleted = await repo.destroyCascade(id, t);
        if (!deleted) {
            await t.rollback();
            throw new AppError('Test not found', 404);
        }
        await t.commit();
        return true;
    } catch (e) {
        try {
            await t.rollback();
        } catch {}
        throw e instanceof AppError ? e : new AppError('Internal server error', 500);
    }
}

async function saveResult(userId, data) {
    const {
        testId,
        groupId,
        score,
        correct_count,
        wrong_count,
        time_spent,
        status
    } = data;
    return TestResult.create({
        userId,
        testId,
        groupId,
        score,
        correct_count,
        wrong_count,
        time_spent,
        status
    });
}

async function getUserResults(userId) {
    if (!userId) return [];
    return TestResult.findAll({
        where: {
            userId
        },
        order: [
            ['createdAt', 'DESC']
        ]
    });
}

async function deleteGroupResults(userId, groupId) {
    return TestResult.destroy({
        where: {
            userId,
            groupId
        }
    });
}

module.exports = {
    listPaged,
    listMetadata,
    listAllMetadata,
    listAdmin,
    getById,
    create,
    update,
    remove,
    saveResult,
    getUserResults,
    deleteGroupResults
};