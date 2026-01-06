const AppError = require("../utils/appError");
const groupService = require('../services/group.service');
const testService = require('../services/test.service');
const { GroupProgress } = require('../models').models;

// ---------------------- SUBMIT RESULT ----------------------
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

// ---------------------- SAVE PROGRESS ----------------------
exports.saveProgress = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const { answers } = req.body;
        const groupId = req.params.id;
        
        const [progress, created] = await GroupProgress.findOrCreate({
            where: { userId: req.user.id, groupId },
            defaults: { answers }
        });

        if (!created) {
            progress.answers = answers;
            await progress.save();
        }

        res.status(200).json({ status: 'success' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ---------------------- GET PROGRESS ----------------------
exports.getProgress = async (req, res) => {
    try {
        if (!req.user) return res.status(200).json({ status: 'success', answers: {} });
        
        const progress = await GroupProgress.findOne({
            where: { userId: req.user.id, groupId: req.params.id }
        });

        res.status(200).json({ 
            status: 'success', 
            answers: progress ? progress.answers : {} 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ---------------------- RESET GROUP RESULTS ----------------------
exports.resetResults = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        await testService.deleteGroupResults(req.user.id, req.params.id);
        res.status(200).json({ status: "success", message: "Results reset successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error!" });
    }
};


// ---------------------- GET ALL GROUPS ----------------------
exports.getGroups = async (req, res) => {
    try {
        // 1. Safe Pagination Inputs
        let page = parseInt(req.query.page, 10);
        let limit = parseInt(req.query.limit, 10);

        // Defensive defaults
        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1) limit = 20;
        if (limit > 50) limit = 50; // Cap limit for performance

        // 2. Service Call
        // listPaged now returns { groups, total, fromCache }
        const result = await groupService.listPaged(page, limit);
        
        // Defensive check: Ensure result exists
        const groups = result && result.groups ? result.groups : [];
        const total = result && typeof result.total === 'number' ? result.total : 0;
        const fromCache = result ? !!result.fromCache : false;

        // 3. Construct Meta
        const totalPages = Math.ceil(total / limit);

        // 4. Response Contract (Strict { data, meta })
        res.status(200).json({
            data: groups,
            meta: {
                page,
                limit,
                totalPages: totalPages || 0,
                totalCount: total || 0,
                fromCache
            }
        });

    } catch (err) {
        // 5. Safe Error Handling - Never return 5xx for list
        console.error('[getGroups] Error:', err);
        
        // Return safe empty response matching contract
        res.status(200).json({
            data: [],
            meta: {
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                totalPages: 0,
                totalCount: 0,
                error: err.message || "Internal Error (Handled)"
            }
        });
    }
};


// ---------------------- GET ONE GROUP ----------------------
exports.getGroup = async (req, res, next) => {
    try {
        const group = await groupService.getById(req.params.id);
        res.status(200).json({
            status: "success",
            time: `${Date.now() - req.time} ms`,
            group
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error!" });
    }
};


// ---------------------- GET GROUP QUESTIONS ----------------------
exports.getGroupQuestions = async (req, res) => {
    try {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 20);
        const { total, questions } = await groupService.getQuestions(req.params.id, page, limit);
        res.status(200).json({
            status: "success",
            data: {
                total,
                questions
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error!" });
    }
};


// ---------------------- CREATE GROUP ----------------------
exports.addGroup = async (req, res) => {
    try {
        const group = await groupService.create(req.body);
        res.status(201).json({
            status: "success",
            time: `${Date.now() - req.time} ms`,
            group
        });
    } catch (err) {
        if (err instanceof AppError) {
            return res.status(err.statusCode || 400).json({ message: err.message });
        }
        console.error(err);
        res.status(500).json({ message: "Internal server error!" });
    }
};


// ---------------------- UPDATE GROUP ----------------------
exports.updateGroup = async (req, res, next) => {
    try {
        const group = await groupService.update(req.params.id, req.body);
        res.status(200).json({
            status: "success",
            time: `${Date.now() - req.time} ms`,
            group
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error!" });
    }
};


// ---------------------- DELETE GROUP ----------------------
exports.deleteGroup = async (req, res) => {
    try {
        await groupService.remove(req.params.id);
        res.status(204).json({ message: "Deleted successfully!" });
    } catch (err) {
        if (err instanceof AppError && err.statusCode === 404) {
            return res.status(404).json({ message: "Group not found" });
        }
        res.status(500).json({ message: "Internal server error!" });
    }
};
