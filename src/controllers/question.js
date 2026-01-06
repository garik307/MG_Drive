const AppError = require('./../utils/appError');
const questionService = require('../services/question.service');

module.exports = {
    addQuestion: async (req, res, next) => {
        try {
            const question = await questionService.add(req.body, req.files);
            return res.status(201).json({
                status: "success",
                time: `${Date.now() - req.time} ms`,
                question
            });
        } catch (error) {
            return next(error);
        }
    },
    getQuestions: async (req, res) => {
        try {
            const { questions } = await questionService.listNormalized();
            
            res.status(200).json({
                status: 'success',
                time: `${Date.now() - req.time}ms`,
                questions
            });
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: 'Internal server error!' });
        }
    },
    getQuestion: async (req, res) => {
        try {
            res.status(201).json({ status: 'success', time: `${Date.now() - req.time} - ms` })
        } catch (e) {
            res.status(500).json({ message: 'Interval server error!' })
        }
    },
    updateQuestion: async (req, res, next) => {
        try {
            const question = await questionService.update(req.params.id, req.body, req.files);
            res.status(201).json({ status: 'success', time: (Date.now() - req.time) + " ms", question });
        } catch (e) {
            return next(e);
        }
    },
    deleteQuestion: async (req, res, next) => {
        try {
            await questionService.remove(req.params.id);
            res.status(203).json({ message: 'Հաջողությամբ ջնջվեց!', redirect: '/admin/questions' });
        } catch (e) {
            return next(e);
        }
    }
}
