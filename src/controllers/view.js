const DB = require('../models');
const { Test, Group, User, Review, Contact, Gallery, Faq } = DB.models;
const { buildSEO } = require('../services/seo');
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
const crypto = require('crypto');
const { Op } = DB.Sequelize;
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

module.exports = {
    getHome: async (req, res) => {
        const contact = await Contact.findOne();
        const reviews = await Review.findAll({
            include: [
                {
                    model: DB.models.User,
                    as: 'user',
                    include: [
                        {
                            model: DB.models.File,
                            as: 'files',
                            required: false
                        }
                    ]
                }
            ],
            order: [['id', 'DESC']]
        });
        const gallery = await Gallery.findAll({
            include: 'files',
            order: [['date', 'DESC']]
        });
        const faqs = await Faq.findAll();

        const teamMembers = await User.findAll({
            where: { role: 'teacher' },
            include: 'files'
        });

        res.render('client/index', {
            ...buildSEO(req),
            teamMembers,
            reviews,
            contact,
            gallery,
            faqs,
            nav_active: 'home'
        });
    },

    getTests: async (req, res) => {
        const testService = require('../services/test.service');
        const tests = await testService.listAllMetadata();
        const contact = await Contact.findOne();

        // Check lock status
        let isLocked = true;
        if (req.user) {
            const allowedRoles = ['student', 'team-member', 'admin'];
            if (allowedRoles.includes(req.user.role) || req.user.isPaid) {
                isLocked = false;
            }
        }

        // Stats calculation
        let userResults = {};
        let stats = {
            totalTests: tests.length,
            passedTests: 0,
            avgScore: 0
        };

        if (req.user) {
            const { TestResult } = DB.models;
            const results = await TestResult.findAll({ where: { userId: req.user.id } });
            
            // Get best result for each test
            results.forEach(r => {
                if (!userResults[r.testId] || r.score > userResults[r.testId].score) {
                    userResults[r.testId] = r;
                }
            });

            const passedCount = Object.values(userResults).filter(r => r.score >= 90).length;
            const totalScore = Object.values(userResults).reduce((sum, r) => sum + r.score, 0);
            const takenCount = Object.values(userResults).length;
            
            stats.passedTests = passedCount;
            stats.avgScore = takenCount > 0 ? Math.round(totalScore / takenCount) : 0;
        }

        // Prepare UI Objects for View
        const uiTests = tests.map(t => {
            const result = userResults && userResults[t.id];
            
            // Default values
            let ui = {
                id: t.id,
                number: t.number,
                questionCount: t.questions ? t.questions.length : 20,
                status: 'new',
                subtitleText: 'Ընդհանուր գիտելիքներ',
                subtitleClass: '',
                scoreText: '',
                buttonText: 'Սկսել',
                buttonIcon: 'fa-play',
                cardClass: '',
                icon: 'fa-regular fa-clipboard',
                badgeClass: 'bg-primary-subtle text-primary',
                buttonClass: 'btn-primary',
                buttonHref: `/tests/${t.id}`,
                isLocked: isLocked,
                lockIcon: isLocked,
                showNewBadge: true
            };

            if (isLocked) {
                ui.buttonText = 'Փակ է';
                ui.buttonIcon = 'fa-lock';
                ui.buttonClass = 'btn-secondary';
                ui.buttonHref = '/profile?tab=payment';
                ui.showNewBadge = false; 
                ui.cardClass += ' opacity-75'; // Bootstrap opacity class
            }

            if (result && (!isLocked)) {
                ui.showNewBadge = false;
                if (result.score >= 90) { // Passed
                    ui.status = 'passed';
                    ui.subtitleText = 'Հանձնված է';
                    ui.subtitleClass = 'text-success fw-bold';
                    ui.scoreText = `${result.correct_count}/20`;
                    ui.buttonText = 'Կրկնել';
                    ui.buttonIcon = 'fa-rotate-right';
                    ui.cardClass = 'border-success';
                    ui.icon = 'fa-solid fa-check text-white'; // Added text-white
                    ui.badgeClass = 'bg-success-subtle text-success';
                    ui.buttonClass = 'btn-outline-dark';
                } else { // Failed
                    ui.status = 'failed';
                    ui.subtitleText = 'Չհանձնված';
                    ui.subtitleClass = 'text-warning fw-bold';
                    ui.scoreText = `${result.correct_count}/20`;
                    ui.buttonText = 'Փորձել կրկին';
                    ui.buttonIcon = 'fa-rotate-right';
                    ui.cardClass = 'border-warning';
                    ui.icon = 'fa-solid fa-triangle-exclamation text-white'; // Added text-white
                    ui.badgeClass = 'bg-warning-subtle text-warning';
                    ui.buttonClass = 'btn-outline-primary';
                }
            } else if (!isLocked) {
                // New state (default)
                ui.showNewBadge = true;
            }

            // Fix icon box bg
            ui.iconBoxClass = '';
            if (ui.status === 'passed') ui.iconBoxClass = 'bg-success';
            else if (ui.status === 'failed') ui.iconBoxClass = 'bg-warning';
            
            return ui;
        });

        res.render('client/pages/test', {
            ...buildSEO(req, {
                title: 'Թեստեր - Ավտոդպրոց Արթիկ',
                description: 'Անցեք վարորդական իրավունքի թեստերը՝ онлайн, անվճար և ժամանակաչափով։'
            }),
            nav_active: 'tests',
            page: req.path,
            contact,
            uiTests,
            tests, 
            userResults,
            stats,
            isLocked
        });
    },

    getGroups: async (req, res) => {
        const groups = await Group.findAll({ include: { model: DB.models.Question, as: 'questions', attributes: ['id'] } });
        const contact = await Contact.findOne();

        // Check lock status
        let isLocked = true;
        if (req.user) {
            const allowedRoles = ['student', 'team-member', 'admin'];
            if (allowedRoles.includes(req.user.role) || req.user.isPaid) {
                isLocked = false;
            }
        }

        // Stats calculation for Groups
        let userResults = {};
        let stats = {
            totalGroups: groups.length,
            passedGroups: 0,
            avgScore: 0
        };

        if (req.user) {
            const { TestResult } = DB.models;
            // Fetch results where groupId is not null (and belongs to user)
            // Note: DB model change allows groupId.
            const results = await TestResult.findAll({ where: { userId: req.user.id } });
            
            // Filter only group results and get best result per group
            results.forEach(r => {
                if (r.groupId) { // Check if it is a group result
                    if (!userResults[r.groupId] || r.score > userResults[r.groupId].score) {
                        userResults[r.groupId] = r;
                    }
                }
            });

            const passedCount = Object.values(userResults).filter(r => r.score >= 90).length;
            const totalScore = Object.values(userResults).reduce((sum, r) => sum + r.score, 0);
            const takenCount = Object.values(userResults).length;
            
            stats.passedGroups = passedCount;
            stats.avgScore = takenCount > 0 ? Math.round(totalScore / takenCount) : 0;
        }

        // Prepare UI Objects for View
        const uiGroups = groups.map(g => {
            const result = userResults && userResults[g.id];
            
            let ui = {
                id: g.id,
                title: (g.title || 'Խումբ') + (g.number > 0 ? ' ' + g.number : ''),
                description: g.text || 'Թեմատիկ հարցեր',
                questionCount: g.questions ? g.questions.length : 0,
                status: 'new',
                statusText: '',
                statusClass: '',
                scoreText: '',
                buttonText: 'Սկսել',
                buttonIcon: 'fa-play',
                cardClass: '',
                icon: 'fa-solid fa-folder-open',
                badgeClass: 'bg-primary-subtle text-primary',
                buttonClass: 'btn-primary',
                buttonHref: `/groups/${g.id}`,
                isLocked: isLocked,
                lockIcon: isLocked,
                showNewBadge: true,
                iconBoxClass: '' // Default empty
            };

            if (result) {
                ui.showNewBadge = false;
                if (result.score >= 90) { // Passed
                    ui.status = 'passed';
                    ui.statusText = 'Հանձնված է';
                    ui.statusClass = 'text-success fw-bold';
                    ui.scoreText = `${result.correct_count}/${ui.questionCount}`;
                    ui.buttonText = 'Կրկնել';
                    ui.buttonIcon = 'fa-rotate-right';
                    ui.cardClass = 'border-success';
                    ui.icon = 'fa-solid fa-check text-white'; // Added text-white
                    ui.badgeClass = 'bg-success-subtle text-success';
                    ui.buttonClass = 'btn-outline-dark';
                    ui.iconBoxClass = 'bg-success';
                } else { // Failed
                    ui.status = 'failed';
                    ui.statusText = 'Չհանձնված';
                    ui.statusClass = 'text-warning fw-bold';
                    ui.scoreText = `${result.correct_count}/${ui.questionCount}`;
                    ui.buttonText = 'Փորձել կրկին';
                    ui.buttonIcon = 'fa-rotate-right';
                    ui.cardClass = 'border-warning';
                    ui.icon = 'fa-solid fa-triangle-exclamation text-white'; // Added text-white
                    ui.badgeClass = 'bg-warning-subtle text-warning';
                    ui.buttonClass = 'btn-outline-primary';
                    ui.iconBoxClass = 'bg-warning';
                }
            }

            if (isLocked) {
                ui.status = 'locked';
                ui.statusText = 'Հասանելի չէ';
                ui.statusClass = 'text-secondary';
                ui.buttonText = 'Փակ է';
                ui.buttonIcon = 'fa-lock';
                ui.cardClass += ' locked-card bg-light opacity-75'; // Added opacity-75
                ui.buttonClass = 'btn-secondary disabled border-0';
                ui.icon = 'fa-solid fa-lock text-secondary';
                ui.buttonHref = '#';
                ui.showNewBadge = false;
                ui.iconBoxClass = 'bg-secondary-subtle';
            } else if (!result) {
                // New (unlocked, no result)
                ui.showNewBadge = true;
            }

            return ui;
        });

        res.render('client/pages/groups', {
            ...buildSEO(req, {
                title: 'Խմբեր - Ավտոդպրոց Արթիկ',
                description: 'Դիտեք ընթացող և առաջիկա խմբերի ժամանակացույցը և availability–ը։'
            }),
            nav_active: 'groups',
            page: req.path,
            contact,
            uiGroups, // Pass this
            groups,   // Keep for length
            userResults,
            stats,
            isLocked
        });
    },

    getGroupDetails: async (req, res) => {
        try {
            // Check lock status
            if (req.user) {
                const allowedRoles = ['student', 'team-member', 'admin'];
                if (!allowedRoles.includes(req.user.role) && !req.user.isPaid) {
                     return res.redirect('/groups');
                }
            } else {
                 return res.redirect('/groups');
            }

            let groupInstance = await Group.findByPk(req.params.id);
            let group = null;
            
            if (groupInstance) {
                // Convert to plain object
                group = groupInstance.get({ plain: true });
                // Questions will be fetched via AJAX
            } else {
                console.log(`[getGroupDetails] Group ${req.params.id} not found.`);
            }

            const contact = await Contact.findOne();

            res.render('client/pages/group-details', {
                ...buildSEO(req, {
                    title: `Խումբ ${group?.title || ''} - Ավտոդպրոց Արթիկ`,
                    description: `Մանրամասն տեղեկատվություն խմբի մասին՝ ժամեր, գներ, մնացած տեղեր։`
                }),
                nav_active: 'groups',
                page: req.path,
                contact,
                group
            });
        } catch (error) {
            console.error('[getGroupDetails] Error:', error);
            res.status(500).send('Server Error');
        }
    },

    getProfile: async (req, res) => {
        const contact = await Contact.findOne();
        let myReview = null;
        let testResults = [];
        let groupResults = [];
        let user = req.user;

        try {
            // Fetch full user with files
            if (req.user && req.user.id) {
                const fullUser = await User.findByPk(req.user.id, { include: 'files' });
                if (fullUser) {
                    user = fullUser.get({ plain: true });
                }
            }

            const { TestResult } = DB.models;
            myReview = await Review.findOne({ where: { user_id: req.user.id } });
            
            // Fetch Test Results
            testResults = await TestResult.findAll({
                where: { 
                    userId: req.user.id,
                    testId: { [Op.ne]: null }
                },
                include: [{
                    model: Test,
                    as: 'test',
                    attributes: ['id', 'number']
                }],
                order: [['createdAt', 'DESC']]
            });

            // Fetch Group Results
            groupResults = await TestResult.findAll({
                where: { 
                    userId: req.user.id,
                    groupId: { [Op.ne]: null }
                },
                include: [{
                    model: Group,
                    as: 'group',
                    attributes: ['id', 'title', 'number']
                }], 
                order: [['createdAt', 'DESC']]
            });
            
        } catch (err) {
            console.error(err);
        }

        res.render('client/pages/user-profile', {
            ...buildSEO(req, {
                title: 'Անձնական Պրոֆիլ',
                description: 'Ձեր հաշվապահական տվյալները, պատմությունը և կարգավորումները։'
            }),
            nav_active: 'profile',
            page: req.path,
            contact,
            hasReview: !!myReview,
            myReview,
            testResults,
            groupResults,
            user // Pass full user data
        });
    },

    getInfoDetails: async (req, res) => {
        let user = req.user;
        const contact = await Contact.findOne();
        if (req.user && req.user.id) {
            const fullUser = await User.findByPk(req.user.id, { include: 'files' });
            if (fullUser) {
                user = fullUser.get({ plain: true });
            }
        }

        res.render('client/pages/profile-info', {
            ...buildSEO(req, {
                title: 'Անձնական Տվյալներ',
                description: 'Փոխեք ձեր անձնական տվյալները՝ անուն, հեռախոս, email։'
            }),
            nav_active: 'info',
            page: req.path,
            contact,
            user // Pass full user data
        });
    },

    getProfileHistory: async (req, res) => {
        let user = req.user;
        const contact = await Contact.findOne();
        if (req.user && req.user.id) {
            const fullUser = await User.findByPk(req.user.id, { include: 'files' });
            if (fullUser) {
                user = fullUser.get({ plain: true });
            }
        }

        res.render('client/pages/profile-history', {
            ...buildSEO(req, {
                title: 'Իմ Պատմությունը',
                description: 'Տեսեք ձեր անցկացրած դասերը և թեստավորումների պատմությունը։'
            }),
            nav_active: 'history',
            page: req.path,
            contact,
            user // Pass full user data
        });
    },

    getProfileOptions: async (req, res) => {
        let user = req.user;
        const contact = await Contact.findOne();
        if (req.user && req.user.id) {
            const fullUser = await User.findByPk(req.user.id, { include: 'files' });
            if (fullUser) {
                user = fullUser.get({ plain: true });
            }
        }

        res.render('client/pages/profile-options', {
            ...buildSEO(req, {
                title: 'Կարգավորումներ',
                description: 'Պրոֆիլի և ծանուցումների կարգավորումները։'
            }),
            nav_active: 'options',
            page: req.path,
            contact,
            user // Pass full user data
        });
    },

    getTestDetails: catchAsync(async (req, res, next) => {
        // Check lock status
        if (req.user) {
            const allowedRoles = ['student', 'team-member', 'admin'];
            if (!allowedRoles.includes(req.user.role) && !req.user.isPaid) {
                 return res.redirect('/tests');
            }
        } else {
             return res.redirect('/tests');
        }

        let test = await Test.findOne({
            include: [{ model: DB.models.Question, as: 'questions', include: 'files' }],
            where: { id: req.params.id },
            order: [
                [{ model: DB.models.Question, as: 'questions' }, 'number', 'ASC'],
                [{ model: DB.models.Question, as: 'questions' }, 'id', 'ASC']
            ]
        });
        const contact = await Contact.findOne();

        if (!test) {
            return next(new AppError('Թեստը չի գտնվել', 404));
        }
        
        // Convert to plain object to allow modification
        test = test.get({ plain: true });

        // --- Consistency Logic with Admin Panel ---
        // If any question has number 0, admin panel resorts by ID and renumbers 1..N
        if (test.questions && test.questions.length > 0) {
            const hasNumbers = test.questions.every(q => (Number(q.number) || 0) > 0);
            if (!hasNumbers) {
                test.questions.sort((a, b) => a.id - b.id);
                test.questions.forEach((q, idx) => {
                    q.number = idx + 1;
                });
            }
        }
        // ------------------------------------------

        res.render('client/pages/test-details', {
            ...buildSEO(req, {
                title: `Թեստ - ${test?.title}`,
                description: `Վարորդական իրավունքի փորձնական թեստ՝ ${test?.title} թեմայով։`
            }),
            nav_active: 'test',
            page: req.path,
            contact,
            test
        });
    }),

    // --- Dynamic Sitemap ---
    generateSitemap: async (req, res) => {
        try {
            const tests = await Test.findAll({ attributes: ['id'] });
            const groups = await Group.findAll({ attributes: ['id'] });

            const links = [
                { url: '/', changefreq: 'weekly', priority: 1 },
                { url: '/tests', changefreq: 'weekly', priority: 0.9 },
                { url: '/groups', changefreq: 'monthly', priority: 0.8 },
                ...tests.map(t => ({
                    url: `/tests/${t.id}`,
                    changefreq: 'monthly',
                    priority: 0.7
                })),
                ...groups.map(g => ({
                    url: `/groups/${g.id}`,
                    changefreq: 'monthly',
                    priority: 0.7
                }))
            ];

            const stream = new SitemapStream({
                hostname: `${req.protocol}://${req.get('host')}`
            });

            const xml = await streamToPromise(
                Readable.from(links).pipe(stream)
            ).then(sm => sm.toString());

            res.header('Content-Type', 'application/xml');
            res.send(xml);
        } catch (err) {
            console.error(err);
            res.status(500).end();
        }
    },

    getLogin: async (req, res) => {
        const contact = await Contact.findOne();
        res.render('client/pages/login', {
            ...buildSEO(req, {
                title: 'Մուտք',
                description: 'Մուտք գործեք անձնական հաշվին։'
            }),
            nav_active: 'login',
            page: req.path,
            contact
        });
    },

    getResetPassword: async (req, res) => {
        try {
            const contact = await Contact.findOne();
            const token = req.params.token;
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
            const user = await User.findOne({
                where: {
                    passwordResetToken: hashedToken,
                    passwordResetExpires: { [Op.gt]: new Date() }
                }
            });
            if (!user) {
                return res.status(400).render('error', {
                    ...buildSEO(req, {
                        title: 'Սխալ տեղի ունեցավ',
                        description: 'Վերականգնման հղման ժամկետը լրացել է կամ թոքենը սխալ է'
                    }),
                    nav_active: 'error',
                    msg: 'Վերականգնման հղման ժամկետը լրացել է կամ թոքենը սխալ է',
                    contact
                });
            }
            res.render('client/pages/resetPassword', {
                ...buildSEO(req, {
                    title: 'Վերականգնել գաղտնաբառը',
                    description: 'Վերականգնեք Ձեր հաշվի գաղտնաբառը'
                }),
                nav_active: 'login',
                token,
                page: req.path,
                contact
            });
        } catch (e) {
            return res.status(500).render('error', {
                ...buildSEO(req, {
                    title: 'Սխալ տեղի ունեցավ',
                    description: 'Սերվերային սխալ. Խնդրում ենք փորձել ավելի ուշ'
                }),
                nav_active: 'error',
                msg: 'Սերվերային սխալ. Խնդրում ենք փորձել ավելի ուշ'
            });
        }
    }
};
