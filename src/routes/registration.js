// Modules
const router = require('express').Router();

// Controllers
const ctrls = require('../controllers');

router
    .route('/')
    .post(ctrls.registration.createRegistration)
    .get(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.registration.getRegistration);

router
    .route('/:id')
    .delete(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.registration.deleteRegistration);

module.exports = router;
