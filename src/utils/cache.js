const redis = require("./redisClient");

module.exports = {
    async get(key) {
        return null;
    },

    async set(key, value, ttl) {
        return true;
    },

    async del(key) {
        try {
            await redis.del(key);
        } catch (e) {
            console.error('Redis DEL error:', e);
        }
    }
};
