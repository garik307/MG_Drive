const router = require('express').Router();

// Controllers
const ctrls = require('../controllers')

router
    .route('/')
    .post(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.test.addTest)
    .get(ctrls.auth.protect, ctrls.test.getTests)

router.post('/submit', ctrls.auth.isLoggedIn, ctrls.test.submitResult);

router
    .route('/:id')
    .get(ctrls.test.getTest)
    .patch(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.test.updateTest)
    .delete(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.test.deleteTest)

module.exports = router;