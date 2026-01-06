
const redis = require('./redisClient');
const AppError = require('./appError');

// Simple in-memory metrics store (flushed to logs periodically or on request)
const metrics = {
    cache: {
        hits: 0,
        misses: 0
    },
    requests: {
        total: 0,
        errors: 0,
        duration: [] // Keep last 100 durations for p95 calc
    },
    db: {
        queryTime: 0
    }
};

exports.trackCache = (hit) => {
    if (hit) metrics.cache.hits++;
    else metrics.cache.misses++;
};

exports.trackRequest = (duration, isError) => {
    metrics.requests.total++;
    if (isError) metrics.requests.errors++;
    
    metrics.requests.duration.push(duration);
    if (metrics.requests.duration.length > 100) {
        metrics.requests.duration.shift();
    }
};

exports.getMetrics = () => {
    const total = metrics.requests.total || 1;
    const durations = metrics.requests.duration.sort((a, b) => a - b);
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    
    return {
        cache_hit_rate: (metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses || 1)).toFixed(2),
        error_rate: (metrics.requests.errors / total).toFixed(2),
        p95_latency: p95,
        total_requests: total
    };
};

exports.middleware = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const isError = res.statusCode >= 400;
        exports.trackRequest(duration, isError);
        
        // Log slow requests
        if (duration > 200) {
            console.warn(`[SLOW] ${req.method} ${req.originalUrl} - ${duration}ms`);
        }
    });
    next();
};
