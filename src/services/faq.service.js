const cache = require('../utils/cache');
const AppError = require('../utils/appError');
const repo = require('../repositories/faqRepository');

const CACHE_KEY = 'faqs:all';
const TTL = 120;

async function getAll() {
  const cached = await cache.get(CACHE_KEY);
  if (cached) return { faqs: cached, fromCache: true };
  const items = await repo.findAll();
  await cache.set(CACHE_KEY, items, TTL);
  return { faqs: items, fromCache: false };
}

async function create(body) {
  const question = body?.title && body.title.trim();
  const answer = body?.text && body.text.trim();
  if (!question) throw new AppError('Հարց դաշտը պարտադիր է', 403);
  if (!answer) throw new AppError('Պատասխանի դաշտը պարտադիր է', 403);
  const faq = await repo.create({ question, answer });
  await cache.del(CACHE_KEY);
  return faq;
}

async function update(id, body) {
  const payload = {};
  if (body?.title !== undefined) payload.question = body.title.trim();
  if (body?.text !== undefined) payload.answer = body.text.trim();
  const faq = await repo.update(id, payload);
  if (!faq) throw new AppError('FAQ չի գտնվել', 404);
  await cache.del(CACHE_KEY);
  return faq;
}

async function remove(id) {
  const deleted = await repo.destroy(id);
  if (!deleted) throw new AppError('FAQ չի գտնվել', 404);
  await cache.del(CACHE_KEY);
  return true;
}

module.exports = { getAll, create, update, remove };
