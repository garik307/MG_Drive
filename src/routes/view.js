// Modules
const { Router } = require('express');

// Controllers
const ctrls = require('../controllers');
// Routes
const router = Router();
if (typeof ctrls.auth?.isLoggedIn === 'function') {
    router.use((req, res, next) => {
        if (req.originalUrl.startsWith('/api')) return next();
        return ctrls.auth.isLoggedIn(req, res, next);
    });
} else {
    console.error('[Routes:view] isLoggedIn middleware is undefined');
}

router.get('/', ctrls.view.getHome);
router.get('/tests', ctrls.view.getTests);
router.get('/groups', ctrls.view.getGroups);
router.get('/tests/:id', ctrls.view.getTestDetails);
router.get('/groups/:id', ctrls.view.getGroupDetails);

router.get(
    '/login',
    ctrls.auth.isLoggedIn,
    ctrls.auth.protectUser,
    ctrls.view.getLogin
);

router.get('/resetPassword/:token', ctrls.auth.isLoggedIn, ctrls.view.getResetPassword);
router.get('/sitemap.xml', ctrls.view.generateSitemap);

if (typeof ctrls.auth?.protect === 'function') {
    router.use((req, res, next) => {
        if (req.originalUrl.startsWith('/api')) return next();
        return ctrls.auth.protect(req, res, next);
    });
} else {
    console.error('[Routes:view] protect middleware is undefined');
}

router.get('/profile', ctrls.view.getProfile);
router.get('/profile/options', ctrls.view.getProfileOptions);
router.get('/profile/history', ctrls.view.getProfileHistory);
router.get('/profile/info', ctrls.view.getInfoDetails);

// Data access
module.exports = router;
