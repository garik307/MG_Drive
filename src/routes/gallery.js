const router = require('express').Router();

const ctrls = require('../controllers');

router
    .route('/')
    .post(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.gallery.addGallery)
    .get(ctrls.gallery.getGalleries);

router
    .route('/:id')
    .patch(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.gallery.updateGallery)
    .delete(ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.gallery.deleteGallery);

module.exports = router;
