// Modules
const router = require('express').Router();

// Controllers
const ctrls = require('../controllers');

router
    .route('/')
    .get(ctrls.contact.getContacts)
    .patch(
        ctrls.auth.protect,
        ctrls.auth.restrictTo('admin'),
        ctrls.contact.updateContacts
    )

router.post('/message', ctrls.contact.createMessage);
router.post('/subscribe', ctrls.contact.subscribe);

router.get(
    '/message',
    ctrls.auth.isLoggedIn,
    ctrls.auth.protect,
    ctrls.auth.restrictTo('admin'),
    ctrls.contact.getMessages
);

router.delete(
    '/message/:id',
    ctrls.auth.isLoggedIn,
    ctrls.auth.protect,
    ctrls.auth.restrictTo('admin'),
    ctrls.contact.deleteMessage
);

module.exports = router;
