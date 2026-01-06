const DB = require('../models');
const redis = require('../utils/redisClient');
const metrics = require('../utils/metrics');
const AppError = require('../utils/appError');
const helpers = require('../utils/helpers');
const testService = require('../services/test.service');

// ------- GET ALL TESTS -------
exports.getTests = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // Cache Versioning Strategy
        let version = await redis.get('tests:version');
        if (!version) {
            version = 1;
            await redis.set('tests:version', version);
        }

        const cacheKey = `tests:list:v${version}:p${page}:l${limit}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
            metrics.trackCache(true);
            return res.status(200).json({
                tests: JSON.parse(cached)
            });
        }
        metrics.trackCache(false);

        // Strict metadata only endpoint with pagination
        const tests = await testService.listMetadata(page, limit);

        await redis.set(cacheKey, JSON.stringify(tests), {
            EX: 300 // 5 minutes, relying on version invalidation
        });

        res.status(200).json({
            tests
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error!" });
    }
};

// ------- SUBMIT RESULT -------
exports.submitResult = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(200).json({ status: "success", saved: false, message: "User not logged in" });
        }
        
        const result = await testService.saveResult(req.user.id, req.body);
        res.status(201).json({
            status: "success",
            saved: true,
            result
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error!" });
    }
};

// ------- GET ONE TEST -------
exports.getTest = async (req, res, next) => {
    try {
        const cacheKey = `test:${req.params.id}:v1`;
        const cached = await redis.get(cacheKey);

        if (cached) {
             metrics.trackCache(true);
             return res.status(200).json({
                status: "success",
                time: "0 ms",
                test: JSON.parse(cached)
            });
        }
        metrics.trackCache(false);

        const test = await testService.getById(req.params.id);

        await redis.set(cacheKey, JSON.stringify(test), { EX: 60 });

        res.status(200).json({
            status: "success",
            time: `${Date.now() - req.time} ms`,
            test
        });
    } catch (err) {
        if (err instanceof AppError && err.statusCode === 404) {
            return next(err);
        }
        console.error(err);
        res.status(500).json({ message: "Internal server error!" });
    }
};

// ------- CREATE TEST -------
exports.addTest = async (req, res) => {
    try {
        const test = await testService.create(req.body);
        await redis.incr('tests:version');
        res.status(201).json({
            status: "success",
            time: `${Date.now() - req.time} ms`,
            test
        });
    } catch (err) {
        if (err instanceof AppError) {
            return res.status(err.statusCode || 400).json({ message: err.message });
        }
        console.error(err);
        res.status(500).json({ message: "Internal server error!" });
    }
};

// ------- UPDATE TEST -------
exports.updateTest = async (req, res, next) => {
    try {
        const test = await testService.update(req.params.id, req.body);
        await redis.incr('tests:version');
        await redis.del(`test:${req.params.id}:v1`);
        res.status(200).json({
            status: "success",
            time: `${Date.now() - req.time} ms`,
            test
        });
    } catch (err) {
        if (err instanceof AppError && err.statusCode === 404) {
            return next(err);
        }
        console.error(err);
        res.status(500).json({ message: "Internal server error!" });
    }
};

// ------- DELETE TEST -------
exports.deleteTest = async (req, res) => {
    try {
        await testService.remove(req.params.id);
        await redis.incr('tests:version');
        res.status(204).json({ message: "Deleted successfully!" });
    } catch (err) {
        if (err instanceof AppError && err.statusCode === 404) {
            return res.status(404).json({ message: "Test not found" });
        }
        console.error(err);
        res.status(500).json({ message: "Internal server error!" });
    }
};
