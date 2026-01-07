const cache = require('../utils/cache');
const AppError = require('../utils/appError');
const dbCon = require('../utils/db');
const repo = require('../repositories/groupRepository');
const { GROUPS_PAGE_PREFIX } = require('../constants/cache');

async function listPaged(page = 1, limit = 20) {
  const key = `${GROUPS_PAGE_PREFIX}:page=${page}:limit=${limit}`;
  const cached = await cache.get(key);
  
  // Validate cache structure
  if (cached && cached.groups && typeof cached.total === 'number') {
      return { ...cached, fromCache: true };
  }

  const offset = (page - 1) * limit;
  // Use findAndCountAll to get total count for safe pagination
  const { count, rows } = await repo.findAndCountAllPaged({ limit, offset });
  
  const groups = rows.map(r => r.get({ plain: true }));
  
  const result = { groups, total: count };
  await cache.set(key, result, 20); // Short TTL for freshness
  
  return { ...result, fromCache: false };
}

async function listAdmin() {
  return repo.findAllAdmin();
}

async function listAllMetadata() {
  const key = 'groups:all:metadata';
  const cached = await cache.get(key);
  if (cached) return cached;

  const rows = await repo.findAllMetadataAll();
  const groups = rows.map(r => {
      const plain = r.get({ plain: true });
      return {
          id: plain.id,
          title: plain.title,
          number: plain.number,
          text: plain.text,
          createdAt: plain.createdAt,
          updatedAt: plain.updatedAt,
          questionCount: parseInt(plain.questionCount || 0, 10)
      };
  });

  await cache.set(key, groups, 3600); // Cache for 1 hour
  return groups;
}

async function getById(id) {
  const group = await repo.findById(id);
  if (!group) throw new AppError('Group not found', 404);
  return group;
}

async function getQuestions(groupId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const { count, rows } = await repo.findQuestionsPaged({ groupId, limit, offset });
  return {
    total: count,
    questions: rows.map(q => q.get({ plain: true }))
  };
}

async function create(body) {
  const title = String(body.title || '').trim();
  const num = Number(body.number || (title.match(/\d+/)?.[0] || 0));
  if (num > 0) {
    const existing = await repo.findByNumber(num);
    if (existing) throw new AppError('Այս համարով խումբ արդեն ավելացված է', 409);
  }
  const group = await repo.create(body);
  return group;
}

async function update(id, body) {
  const group = await repo.update(id, body);
  if (!group) throw new AppError('Group not found', 404);
  return group;
}

async function remove(id) {
  const t = await dbCon.con.transaction();
  try {
    const deleted = await repo.destroyCascade(id, t);
    if (!deleted) {
      await t.rollback();
      throw new AppError('Group not found', 404);
    }
    await t.commit();
    return true;
  } catch (e) {
    try { await t.rollback(); } catch {}
    throw e instanceof AppError ? e : new AppError('Internal server error', 500);
  }
}

module.exports = { listPaged, listAdmin, listAllMetadata, getById, create, update, remove, getQuestions };

