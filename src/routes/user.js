const router = require('express').Router();
const { loginLimiter } = require('../utils/limiter');

const ctrls = require('../controllers');

router.use(ctrls.auth.isLoggedIn)


router.post('/signUp', ctrls.auth.protectUser, ctrls.auth.signUp);
router.post('/signIn', ctrls.auth.protectUser, loginLimiter, ctrls.auth.signIn);
router.post('/signUpByAdmin', ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.auth.signUpByAdmin);
router.post('/forgotPassword', ctrls.auth.protectUser, ctrls.auth.forgotPassword);
router.post('/resetPassword/:token', ctrls.auth.resetPassword);
router.get('/', ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.user.getUsers);
router.patch('/updateMyPassword', ctrls.auth.protect, ctrls.auth.updatePassword);
router.patch('/updateme', ctrls.auth.protect, ctrls.user.updateMe);
router.delete('/avatar', ctrls.auth.protect, ctrls.user.deleteAvatar);
router.patch('/:id', ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.user.updateUser);
router.delete('/:id', ctrls.auth.protect, ctrls.auth.restrictTo('admin'), ctrls.user.deleteUser);
router.post('/logout', ctrls.auth.protect, ctrls.auth.logOut);
router.post('/reset-tests', ctrls.auth.protect, ctrls.user.resetTests);
router.post('/reset-groups', ctrls.auth.protect, ctrls.user.resetGroups);

module.exports = router;
