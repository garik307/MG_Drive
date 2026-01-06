const { USERS_ALL_KEY, USERS_TTL } = require('../constants/cache');
const cache = require('../utils/cache');
const AppError = require('../utils/appError');
const Files = require('../controllers/File');
const repo = require('../repositories/userRepository');
const { Sequelize } = require('../models');

async function getAll({ excludeRoles = [] } = {}) {
  const cacheKey = USERS_ALL_KEY;
  const cached = await cache.get(cacheKey);
  if (cached) return { users: cached, fromCache: true };
  const where = excludeRoles.length
    ? { role: { [Sequelize.Op.notIn]: excludeRoles } }
    : {};
  const users = await repo.findAll({ where });
  await cache.set(cacheKey, users, USERS_TTL);
  return { users, fromCache: false };
}

async function listPaged(page = 1, limit = 20, search = '', role = 'all', excludeId = null) {
    const offset = (page - 1) * limit;
    const where = {};
    
    if (excludeId) {
        where.id = { [Sequelize.Op.ne]: excludeId };
    }

    if (role !== 'all') {
        where.role = role;
    }

    if (search) {
        where[Sequelize.Op.or] = [
            { name: { [Sequelize.Op.like]: `%${search}%` } },
            { email: { [Sequelize.Op.like]: `%${search}%` } }
        ];
    }

    const { count, rows } = await repo.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'name', 'email', 'role', 'isPaid', 'createdAt'] // Select only needed columns
    });

    return { users: rows, total: count };
}

async function countByRole(role) {
    return repo.count({ where: { role } });
}

async function updateUser(id, body, files) {
  const user = await repo.findById(id);
  if (!user) throw new AppError('User not found.', 404);

  // Check email uniqueness
  if (body.email && body.email !== user.email) {
    const existingUsers = await repo.findAll({ where: { email: body.email } });
    if (existingUsers.length > 0) {
      throw new AppError('Այս էլ․ հասցեն արդեն գրանցված է համակարգում։', 400);
    }
  }

  // If setting isPaid to true, set expiration to 30 days from now
   if (body.isPaid === true || body.isPaid === 'true') {
       user.isPaid = true;
       user.paymentExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
   } else if (body.isPaid === false || body.isPaid === 'false') {
      user.isPaid = false;
      user.paymentExpiresAt = null;
  }
  
  for (let key in body) {
      if (key !== 'isPaid') { // Handle isPaid separately above
          user[key] = body[key];
      }
  }

  await repo.save(user);
  if (files?.user_img) {
    const img = await new Files(user, files.user_img).replace('user_img');
    if (img.status !== 'success') {
      const msg = typeof img.message === 'object' ? Object.values(img.message).join(' ') : img.message;
      throw new AppError(msg, 400);
    }
    await user.createFile(img.table);
  }
  await cache.del(USERS_ALL_KEY);
  return user;
}

async function updateMe(currentUserId, body, files) {
  const user = await repo.findById(currentUserId);
  if (!user) throw new AppError('User not found.', 404);

  if (body.email && body.email !== user.email) {
    const existingUsers = await repo.findAll({ where: { email: body.email } });
    if (existingUsers.length > 0) {
      throw new AppError('Այս էլ․ հասցեն արդեն գրանցված է համակարգում։', 400);
    }
  }

  for (let key in body) user[key] = body[key];
  await repo.save(user);
  if (files?.user_img) {
    const img = await new Files(user, files.user_img).replace('user_img');
    if (img.status !== 'success') {
      const msg = typeof img.message === 'object' ? Object.values(img.message).join(' ') : img.message;
      throw new AppError(msg, 400);
    }
    await user.createFile(img.table);
  }
  await cache.del(USERS_ALL_KEY);
  return user;
}

async function deleteUser(id) {
  const user = await repo.findById(id);
  if (!user) throw new AppError('User not found.', 404);
  user.deleted = true;
  await repo.save(user);
  await cache.del(USERS_ALL_KEY);
  return true;
}

async function deleteAvatar(currentUserId) {
  const user = await repo.findById(currentUserId);
  if (!user) throw new AppError('User not found.', 404);
  const file = await repo.findAvatarFileForUser(user.id);
  if (!file) throw new AppError('Avatar not found.', 404);
  await repo.destroyFileById(file.id);
  await cache.del(USERS_ALL_KEY);
  return true;
}

module.exports = { getAll, listPaged, countByRole, updateUser, updateMe, deleteUser, deleteAvatar };
