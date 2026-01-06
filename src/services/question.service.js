const cache = require('../utils/cache');
const AppError = require('../utils/appError');
const dbCon = require('../utils/db');
const repo = require('../repositories/questionRepository');
const Files = require('../controllers/File');
const { QUESTIONS_ALL_KEY } = require('../constants/cache');

async function add(body, files) {
  const t = await dbCon.con.transaction();
  try {
    let options;
    try { options = typeof body.options === 'string' ? JSON.parse(body.options) : body.options; } catch { options = []; }
    const table = body.table_name;
    const rowId = Number(body.row_id);
    const correctIdx = Number(body.correctAnswerIndex);
    const questionText = (body.question || '').trim();

    if (!rowId) throw new AppError('Պարտադիր ընտրեք թեստ կամ խումբ', 403);
    if (!questionText) throw new AppError('Հարցի դաշտը չի կարող դատարկ լինել', 403);
    if (!Array.isArray(options) || options.length === 0) throw new AppError('Պարտադիր է ավելացնել պատասխաններ', 403);
    if (!['tests','groups'].includes(table)) throw new AppError('Սխալ ownership (tests կամ groups)', 403);
    if (!Number.isInteger(correctIdx) || correctIdx < 1 || correctIdx > options.length) throw new AppError('Ընտրեք ճիշտ պատասխանը', 403);

    body.row_id = rowId;
    body.table_name = table;
    body.correctAnswerIndex = correctIdx;
    body.question = questionText;
    body.options = options;
    try {
      const max = await repo.getMaxNumberByOwner(table, rowId);
      body.number = max + 1;
    } catch {}
    const question = await repo.create(body, t);
    if (files?.question_img) {
      await question.reload({ include: 'files', transaction: t });
      const image = await new Files(question, files.question_img).replace('question_img');
      if (image.status !== 'success') {
        const msg = typeof image.message === 'object' ? Object.values(image.message).join(' ') : image.message;
        throw new AppError(msg, 400);
      }
      await question.createFile({ ...image.table, row_id: question.id }, { transaction: t });
    }
    await t.commit();
    await cache.del(QUESTIONS_ALL_KEY);
    const full = await repo.findByIdWithFiles(question.id);
    return full;
  } catch (e) {
    try { await t.rollback(); } catch {}
    if (e.name && e.name.startsWith('Sequelize')) {
      throw new AppError(e.message || 'Database error', 400);
    }
    throw e instanceof AppError ? e : new AppError('Internal server error', 500);
  }
}

async function listNormalized() {
  const cached = await cache.get(QUESTIONS_ALL_KEY);
  if (cached) return { questions: cached, fromCache: true };
  const questions = await repo.findAllBasic();
  const tests = await repo.findAllTests();
  const groups = await repo.findAllGroups();
  const testMap = Object.fromEntries(tests.map(t => [t.id, t]));
  const groupMap = Object.fromEntries(groups.map(g => [g.id, g]));
  const ids = questions.map(q => q.id);
  const files = await repo.findFilesByRowIds(ids);
  const fileMap = files.reduce((acc, f) => {
    const arr = acc[f.row_id] || [];
    arr.push(f);
    acc[f.row_id] = arr;
    return acc;
  }, {});
  const normalized = questions.map(q => {
    const ownerType = q.table_name === 'tests' ? 'test' : (q.table_name === 'groups' ? 'group' : 'unknown');
    const ownerData = ownerType === 'test' ? testMap[q.row_id] : (ownerType === 'group' ? groupMap[q.row_id] : null);
    const owner = { type: ownerType, data: ownerData };
    let options;
    if (Array.isArray(q.options)) options = q.options;
    else if (typeof q.options === 'string') { try { options = JSON.parse(q.options); } catch { options = []; } }
    else options = [];
    const num = Number(q.number) || 0;
    return { id: q.id, question: q.question, options, row_id: q.row_id, table_name: q.table_name, correctAnswerIndex: q.correctAnswerIndex, owner, files: fileMap[q.id] || [], number: num };
  });
  const byOwner = new Map();
  normalized.forEach(q => {
    const key = `${q.table_name}:${q.row_id}`;
    const arr = byOwner.get(key) || [];
    arr.push(q);
    byOwner.set(key, arr);
  });
  byOwner.forEach(arr => {
    const hasNumbers = arr.every(x => (Number(x.number) || 0) > 0);
    if (!hasNumbers) {
      arr.sort((a,b) => a.id - b.id);
      arr.forEach((q, idx) => { q.number = idx + 1; });
    }
  });
  const ordered = normalized.slice().sort((a,b) => {
    const aOwnerNum = a.owner?.data?.number ?? 0;
    const bOwnerNum = b.owner?.data?.number ?? 0;
    if (a.table_name !== b.table_name) return a.table_name < b.table_name ? -1 : 1;
    if (aOwnerNum !== bOwnerNum) return aOwnerNum - bOwnerNum;
    return a.number - b.number;
  });
  await cache.set(QUESTIONS_ALL_KEY, ordered, 60);
  return { questions: ordered, fromCache: false };
}

async function update(id, body, files) {
  const question = await repo.findByIdWithFiles(id);
  if (!question) throw new AppError('question is not found.', 404);
  if (body.options !== undefined) {
    try {
      question.options = typeof body.options === 'string' ? JSON.parse(body.options) : body.options;
    } catch {
      question.options = [];
    }
  }
  if (body.correctAnswerIndex !== undefined) {
    const idx = Number(body.correctAnswerIndex);
    question.correctAnswerIndex = Number.isNaN(idx) ? question.correctAnswerIndex : idx;
  }
  if (body.question !== undefined) {
    question.question = String(body.question || '').trim();
  }
  if (body.table_name) question.table_name = body.table_name;
  if (body.row_id) question.row_id = Number(body.row_id);
  await repo.save(question);
  if (files?.question_img) {
    const image = await new Files(question, files.question_img).replace('question_img');
    if (image.status !== 'success') {
      const msg = typeof image.message === 'object' ? Object.values(image.message).join(' ') : image.message;
      throw new AppError(msg, 400);
    }
    await question.createFile(image.table);
  }
  await cache.del(QUESTIONS_ALL_KEY);
  return question;
}

async function remove(id) {
  const question = await repo.findByIdWithFiles(id);
  if (!question) throw new AppError('Question not found.', 404);
  const file = await repo.findFileByRowId(question.id);
  await repo.destroyById(question.id);
  if (file) await repo.destroyFileById(file.id);
  await cache.del(QUESTIONS_ALL_KEY);
  return true;
}

module.exports = { add, listNormalized, update, remove };
