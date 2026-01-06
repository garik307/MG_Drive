const Queue = require('bull');

const jobQueue = new Queue('background-jobs', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

module.exports = { jobQueue };
