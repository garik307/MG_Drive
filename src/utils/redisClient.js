const { createClient } = require("redis");

// In-memory fallback client (safe, simple)
const mockClient = {
    store: new Map(),
    isOpen: true,

    async connect() {
        console.log("⚠️ Using In-Memory Cache (Redis fallback)");
    },

    async get(key) {
        return this.store.get(key);
    },

    async set(key, value, options = {}) {
        this.store.set(key, value);

        if (options.EX) {
            setTimeout(() => this.store.delete(key), options.EX * 1000);
        }
    },

    async del(key) {
        this.store.delete(key);
    },

    async flushAll() {
        this.store.clear();
    },

    async sAdd(key, value) {
        let set = this.store.get(key);
        if (!(set instanceof Set)) {
            set = new Set();
            this.store.set(key, set);
        }
        set.add(value);
    },

    async incr(key) {
        let value = this.store.get(key);
        value = Number(value) || 0;
        value++;
        this.store.set(key, value);
        return value;
    },

    async expire(key, seconds) {
        setTimeout(() => this.store.delete(key), seconds * 1000);
    },

    on() {}
};
 
// REAL Redis client (Railway / Production)
 
// const redisUrl = process.env.REDIS_URL;
const redisUrl =  process.env.NODE_ENV === 'production' ? process.env.REDIS_URL : null;
 
let realClient = null;
let activeClient = mockClient;

if (redisUrl) {
    realClient = createClient({
        url: redisUrl,
        socket: {
            connectTimeout: 5000,
            reconnectStrategy: false,
        },
    });

    realClient.on("error", (err) => {
        if (activeClient === mockClient) return;
        console.error("🔴 Redis error:", err.message);
    });
}

// Proxy – app uses ONE client always
const redis = new Proxy({}, {
    get(_, prop) {
        const client = activeClient || mockClient;
        if (typeof client[prop] === "function") {
            return client[prop].bind(client);
        }
        return client[prop];
    }
});

// Init Redis
(async () => {
    if (!realClient) {
        await mockClient.connect();
        return;
    }

    try {
        await realClient.connect();
        activeClient = realClient;
        console.log("🟢 Redis connected ✔", (redisUrl ? redisUrl : "In-Memory Cache 😒"));
    } catch (err) {
        console.warn("🟡 Redis unavailable, using fallback");
        activeClient = mockClient;
    }
})();

module.exports = redis;