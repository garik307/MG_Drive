const routes = require('../routes');

module.exports = api = (app) => {
    try {
        const regs = [
            ['/api/v1/user', routes.user, 'user'],
            ['/api/v1/tests', routes.test, 'test'],
            ['/api/v1/groups', routes.group, 'group'],
            ['/api/v1/question', routes.question, 'question'],
            ['/api/v1/gallery', routes.gallery, 'gallery'],
            ['/api/v1/faq', routes.faq, 'faq'],
            ['/api/v1/registration', routes.registration, 'registration'],
            ['/api/v1/image', routes.image, 'image'],
            ['/api/v1/review', routes.review, 'review'],
            ['/api/v1/contact', routes.contact, 'contact'],
            ['/', routes.view, 'view'],
            ['/admin', routes.adminView, 'adminView']
        ];
        for (const [path, router, name] of regs) {
            if (typeof router !== 'function') {
                console.error(`[API] skipped ${name}: expected function, got ${typeof router}`);
                continue;
            }
            app.use(path, router);
        }
    } catch (e) {
        console.error('[API] registration error:', e);
        throw e;
    }
};
