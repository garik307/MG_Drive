const cache = require('../utils/cache');
const AppError = require('../utils/appError');
const { CONTACTS_KEY } = require('../constants/cache');
const { models } = require('../models');

async function get() {
  const cached = await cache.get(CONTACTS_KEY);
  if (cached) return { contact: cached, fromCache: true };
  const contact = await models.Contact.findOne();
  if (!contact) throw new AppError('Կոնտակտային տվյալները չեն գտնվել։', 404);
  const plain = contact.get({ plain: true });
  await cache.set(CONTACTS_KEY, plain, 60);
  return { contact: plain, fromCache: false };
}

module.exports = { get };

