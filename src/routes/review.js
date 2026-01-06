const router = require('express').Router();

const ctrls = require('../controllers');

router.post('/', ctrls.auth.isLoggedIn, ctrls.auth.protect, ctrls.auth.restrictTo('student', 'admin', 'user'), ctrls.review.addReview);


module.exports = router;
