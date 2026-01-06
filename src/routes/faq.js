const router = require('express').Router();
const ctrls = require('../controllers');

router.get('/', ctrls.faq.getFaqs);
router.post('/', ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.faq.addFaq);
router.put('/:id', ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.faq.updateFaq);
router.delete('/:id', ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.faq.deleteFaq);

module.exports = router;

