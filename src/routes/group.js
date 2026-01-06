const router = require('express').Router();

// Controllers
const ctrls = require('../controllers')

router.route('/')
    .post(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.group.addGroup)
    .get(ctrls.group.getGroups)

router.post('/submit', ctrls.auth.isLoggedIn, ctrls.group.submitResult);
router.delete('/:id/results', ctrls.auth.isLoggedIn, ctrls.group.resetResults);

router.get('/:id/progress', ctrls.auth.isLoggedIn, ctrls.group.getProgress);
router.post('/:id/progress', ctrls.auth.isLoggedIn, ctrls.group.saveProgress);

router.get('/:id/questions', ctrls.group.getGroupQuestions);

router.route('/:id')
    .get(ctrls.group.getGroup)
    .patch(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.group.updateGroup)
    .delete(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.group.deleteGroup)

module.exports = router;