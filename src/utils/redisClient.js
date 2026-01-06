const { createClient } = require("redis");

let activeClient = null;

const mockClient = {
    store: new Map(),
    isOpen: true,
    async connect() { console.log("Using In-Memory Cache"); },
    async get(key) { return this.store.get(key); },
    async set(key, value, options) { 
        this.store.set(key, value);
        if (options?.EX) setTimeout(() => this.store.delete(key), options.EX * 1000);
    },
    async del(key) { this.store.delete(key); },
    async flushAll() { this.store.clear(); },
    async sAdd(key, val) { 
        let s = this.store.get(key);
        if (!(s instanceof Set)) { s = new Set(); this.store.set(key, s); }
        s.add(val);
    },
    async incr(key) {
        let v = this.store.get(key);
        if (typeof v !== 'number') v = parseInt(v) || 0;
        v++;
        this.store.set(key, v);
        return v;
    },
    async expire(key, seconds) {
        // Simple timeout, no cancellation on re-set
        setTimeout(() => this.store.delete(key), seconds * 1000);
    },
    on() {}
};

const realClient = createClient({
    url: "redis://127.0.0.1:6379",
    socket: { connectTimeout: 1000, reconnectStrategy: false }
});

realClient.on("error", (err) => {
    // Suppress heavy logs if we are already using mock
    if (activeClient === mockClient) return;
    console.log("Redis error (will use fallback):", err.message);
});

const proxy = new Proxy({}, {
    get(target, prop) {
        const client = activeClient || mockClient; // Use mock if not yet determined
        if (prop === 'isOpen') return client.isOpen;
        if (typeof client[prop] === 'function') {
            return client[prop].bind(client);
        }
        return client[prop];
    }
});

(async () => {
    try {
        await realClient.connect();
        activeClient = realClient;
        console.log("Redis connected ✔");
    } catch (e) {
        console.log("Redis unavailable, using In-Memory Cache.");
        activeClient = mockClient;
    }
})();

module.exports = proxy;
