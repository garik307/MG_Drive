const router = require('express').Router();

// Controllers
const ctrls = require('../controllers')

router.route('/')
    .get(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.question.getQuestions)
    .post(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.question.addQuestion)
router.route('/:id')
    .patch(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.question.updateQuestion)
    .delete(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.question.deleteQuestion)

module.exports = router;