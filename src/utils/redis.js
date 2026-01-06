const redis = require("redis");
const client = redis.createClient();

client.connect().catch(console.error);

module.exports = client;