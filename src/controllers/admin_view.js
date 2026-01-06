// Models
const DB = require('../models');
const { Test, Group, Question, File, User, Contact, Registration, ContactMessage } = DB.models;

const cache = require("../utils/cache");
const helpers = require("../utils/helpers");

const { Op } = DB.Sequelize;

// ---------- COMMON DB QUERIES ---------- //
async function getCached(key, fetchFn, ttl = 5, force = false) {
    const cached = await cache.get(key);
    if (cached) return cached;

    const fresh = await fetchFn();
    await cache.set(key, fresh, ttl);
    return fresh; 
}

// Fast centralized getters
async function getAllTests() {
    const testService = require('../services/test.service');
    return await testService.listAllMetadata(); // Use optimized metadata query (Pattern #2)
}
async function getAllGroups() {
    const groupService = require('../services/group.service');
    return await groupService.listAllMetadata(); // Use optimized metadata query
}
async function getAllStudents() {
    return getCached("students_all", () =>
        User.findAll({ where: { role: "student" }, raw: true })
    );
}
async function getAllQuestions() {
    const questionService = require('../services/question.service');
    const { questions } = await questionService.listNormalized();
    return questions;
}
async function getAllTestsQuestionsCount() {
    return getCached("questions_all_count", () =>
        Question.count({
            where: {table_name: 'tests'}
        })
    );
}
async function getContact() {
    return getCached("contact_all", () =>
        Contact.findOne()
    );
}
async function getGroupQuestions() {
    return getCached("questions_groups_all", () =>
        Question.findAll({
            where: {table_name: 'groups'},
            attributes: ["id", "table_name"],
        })
    );
}

// CONTROLLERS
exports.getDashboard = async (req, res) => {
    try {
        const { TestResult, User } = DB.models;
        const { Op } = require('sequelize');

        // Date Filter Logic
        const now = new Date();
        
        // Default: "Start" = Today, "End" = End of current month
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        let endDate = req.query.endDate ? new Date(req.query.endDate) : endOfCurrentMonth;
        let startDate = req.query.startDate ? new Date(req.query.startDate) : todayStart;
        
        // Ensure endDate is end of day
        endDate.setHours(23, 59, 59, 999);

        // Fetch all students (Optimized: Pattern #2)
        const students = await User.findAll({ 
            where: { role: 'student' }, 
            attributes: ['id', 'name', 'email', 'include_in_analytics'],
            order: [['createdAt', 'DESC']],
            raw: true
        });
        
        // Fetch test results within range (Optimized: Pattern #2)
        const results = await TestResult.findAll({
            where: {
                createdAt: {
                    [Op.between]: [startDate, endDate]
                }
            },
            order: [['createdAt', 'ASC']],
            attributes: ['userId', 'score', 'createdAt', 'testId', 'groupId'],
            raw: true
        });

        // --- Process Student Analytics ---
        const userStats = {};
        students.forEach(s => {
            userStats[s.id] = {
                id: s.id,
                name: s.name,
                email: s.email,
                include_in_analytics: s.include_in_analytics !== false, 
                attempts: 0,
                scores: [],
                testScores: [],
                groupScores: [],
                latestScore: 0,
                growth: 0,
                testGrowth: 0,
                groupGrowth: 0,
                status: 'stagnant', // improving, stagnant, risk
                history: []
            };
        });

        results.forEach(r => {
            if (userStats[r.userId]) {
                const stats = userStats[r.userId];
                stats.attempts++;
                stats.scores.push(r.score);
                
                if (r.testId) stats.testScores.push(r.score);
                if (r.groupId) stats.groupScores.push(r.score);

                stats.latestScore = r.score;
                stats.history.push({ date: r.createdAt, score: r.score });
            }
        });

        // Calculate Metrics for Display (For ALL users)
        Object.values(userStats).forEach(stats => {
            // Overall Growth
            if (stats.attempts > 1) {
                const previousScores = stats.scores.slice(0, -1);
                const avgPrevious = previousScores.reduce((a, b) => a + b, 0) / previousScores.length;
                stats.growth = stats.latestScore - avgPrevious;
            } else {
                stats.growth = 0;
            }

            // Test Growth
            if (stats.testScores.length > 1) {
                const latest = stats.testScores[stats.testScores.length - 1];
                const previous = stats.testScores.slice(0, -1);
                const avgPrev = previous.reduce((a, b) => a + b, 0) / previous.length;
                stats.testGrowth = latest - avgPrev;
            } else {
                stats.testGrowth = 0;
            }

            // Group Growth
            if (stats.groupScores.length > 1) {
                const latest = stats.groupScores[stats.groupScores.length - 1];
                const previous = stats.groupScores.slice(0, -1);
                const avgPrev = previous.reduce((a, b) => a + b, 0) / previous.length;
                stats.groupGrowth = latest - avgPrev;
            } else {
                stats.groupGrowth = 0;
            }

            // Status Logic
            if (stats.latestScore < 50 || (stats.attempts > 2 && stats.growth < -5)) {
                stats.status = 'risk';
            } else if (stats.growth > 3 || (stats.latestScore > 80 && stats.growth >= 0)) {
                stats.status = 'improving';
            } else {
                stats.status = 'stagnant';
            }
        });

        // Filter for KPI & Chart (Only active students)
        const activeStudents = Object.values(userStats).filter(s => s.include_in_analytics);

        let totalGrowth = 0;
        let studentsWithGrowth = 0;
        let improvingCount = 0;
        let riskCount = 0;
        let stagnantCount = 0;

        activeStudents.forEach(stats => {
            // Only count if they have activity in this period?
            // User requested "analytics works for this period". 
            // If user has 0 attempts in this period, they are inactive in this period.
            if (stats.attempts > 0) {
                if (stats.status === 'improving') improvingCount++;
                else if (stats.status === 'risk') riskCount++;
                else stagnantCount++;

                if (stats.attempts > 1) {
                    totalGrowth += stats.growth;
                    studentsWithGrowth++;
                }
            }
        });

        const avgScoreGrowth = studentsWithGrowth > 0 ? (totalGrowth / studentsWithGrowth).toFixed(1) : 0;

        // --- Chart Data Logic (Dynamic Grouping) ---
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let labels = [];
        let dataPoints = []; // List of dates/periods to check standing

        if (diffDays > 90) {
            // Monthly Grouping
            let current = new Date(startDate);
            current.setDate(1); // Start of month
            
            while (current <= endDate) {
                labels.push(current.toLocaleDateString('hy-AM', { month: 'short', year: 'numeric' }));
                
                // End of this month
                let endOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
                if (endOfMonth > endDate) endOfMonth = new Date(endDate);
                
                dataPoints.push(endOfMonth);
                current.setMonth(current.getMonth() + 1);
            }
        } else {
            // Daily Grouping
            let current = new Date(startDate);
            while (current <= endDate) {
                labels.push(current.toLocaleDateString('hy-AM', { day: 'numeric', month: 'short' }));
                
                let endOfDay = new Date(current);
                endOfDay.setHours(23, 59, 59);
                dataPoints.push(endOfDay);
                
                current.setDate(current.getDate() + 1);
            }
        }

        const chartData = {
            labels: labels,
            improving: new Array(labels.length).fill(null),
            stagnant: new Array(labels.length).fill(null),
            risk: new Array(labels.length).fill(null)
        };

        // Helper to calculate standing at a specific point in time
        const calculateStanding = (userList, targetDate) => {
            let sum = 0;
            let count = 0;

            userList.forEach(u => {
                // Filter history up to targetDate (but only within range?)
                // Actually, if we filtered results by range, u.history ONLY contains results in range.
                // So we just take the latest result <= targetDate.
                // Standing should reflect "current score at that time".
                
                u.history.sort((a, b) => new Date(a.date) - new Date(b.date));
                const validTests = u.history.filter(h => new Date(h.date) <= targetDate);
                
                if (validTests.length > 0) {
                    const latest = validTests[validTests.length - 1];
                    sum += latest.score;
                    count++;
                }
            });

            return count > 0 ? (sum / count) : null;
        };

        // Classify ACTIVE users for Chart
        // Only include those who have activity in this period
        const activeInPeriod = activeStudents.filter(s => s.attempts > 0);
        
        const improvingUsers = activeInPeriod.filter(u => u.status === 'improving');
        const stagnantUsers = activeInPeriod.filter(u => u.status === 'stagnant');
        const riskUsers = activeInPeriod.filter(u => u.status === 'risk');

        // Fill chart data
        dataPoints.forEach((point, index) => {
            chartData.improving[index] = calculateStanding(improvingUsers, point);
            chartData.stagnant[index] = calculateStanding(stagnantUsers, point);
            chartData.risk[index] = calculateStanding(riskUsers, point);
        });

        // Pagination & Filter Logic
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 20;
        const search = (req.query.search || '').toLowerCase();
        const statusFilter = req.query.status || 'all';
        
        // Preserve DB order (newest first)
        let allStudentsList = students.map(s => userStats[s.id]);

        // 1. Filter by Search
        if (search) {
            allStudentsList = allStudentsList.filter(s => 
                s.name.toLowerCase().includes(search) || 
                s.email.toLowerCase().includes(search)
            );
        }

        // 2. Filter by Status
        if (statusFilter !== 'all') {
            allStudentsList = allStudentsList.filter(s => s.status === statusFilter);
        }

        const offset = (page - 1) * limit;
        const paginatedStudents = allStudentsList.slice(offset, offset + limit);
        const totalPages = Math.ceil(allStudentsList.length / limit);

        res.render("admin/layouts/default", {
            title: "Վահանակ",
            nav_active: "dashboard",
            kpi: {
                totalStudents: activeInPeriod.length, // Only count active in period
                avgGrowth: avgScoreGrowth,
                improving: improvingCount,
                risk: riskCount,
                stagnant: stagnantCount
            },
            chartData,
            students: paginatedStudents,
            pagination: {
                page,
                totalPages,
                totalItems: allStudentsList.length
            },
            url: '/admin',
            filters: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                search,
                status: statusFilter
            }
        });

    } catch (e) {
        console.error(e);
        res.status(500).send("Server error");
    }
};

exports.toggleAnalytics = async (req, res) => {
    try {
        const { User } = DB.models;
        const { id } = req.params;
        const { include } = req.body; 

        await User.update({ include_in_analytics: include }, { where: { id } });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false });
    }
};

exports.bulkToggleAnalytics = async (req, res) => {
    try {
        const { User } = DB.models;
        const { include } = req.body; // true or false

        await User.update(
            { include_in_analytics: include },
            { where: { role: 'student' } }
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false });
    }
};

exports.getTests = async (req, res) => {
    try {
        const testsData = await getAllTests();
        // Map to ensure view compatibility (t.questions.length)
        const tests = testsData.map(t => ({
            ...t,
            questions: { length: t.questionCount || 0 }
        }));

        const count = await getAllTestsQuestionsCount();
        const testsAllQuestions = { length: count }; // Mock array for view compatibility

        const totalTests = tests.length;
        const totalQuestions = tests.reduce((acc, t) => acc + (t.questionCount || 0), 0);
        const averageQuestions = totalTests > 0 ? (totalQuestions / totalTests).toFixed(1) : 0;

        res.render("admin/pages/tests", {
            title: "Թեստեր",
            nav_active: "tests",
            testsAllQuestions,
            averageQuestions,
            helpers,
            getTests: tests
        });

    } catch (e) {
        console.error(e);
        res.status(500).send("Server error");
    }
};

exports.getGroups = async (req, res) => {
    try {
        const groupsData = await getAllGroups();
        // Map for view compatibility
        const groups = groupsData.map(g => ({
            ...g,
            questions: { length: g.questionCount || 0 }
        }));

        const groupQuestions = await getGroupQuestions();
        const groupCount = groups.length;
        const questionCount = groups.reduce((sum, g) => sum + (g.questionCount || 0), 0);
        const avgGroupQuestions = groupCount > 0 ? (questionCount / groupCount).toFixed(1) : 0;

        
        res.render("admin/pages/groups", {
            title: "Խմբեր",
            nav_active: "groups",
            groups,
            groupQuestions,
            avgGroupQuestions,
            helpers
        });
    } catch (e) {
        console.error(e);
        res.status(500).send("Server error");
    }
};

exports.getQuestions = async (req, res) => {
    try {
        const [tRes, gRes] = await Promise.allSettled([
            getAllTests(),
            getAllGroups()
        ]);

        const questions = [];
        const tests     = tRes.status === 'fulfilled' ? tRes.value : [];
        const groups    = gRes.status === 'fulfilled' ? gRes.value : [];

        res.render("admin/pages/questions", {
            title: "Հարցեր",
            nav_active: "questions",
            questions,
            tests,
            groups,
            url: req.url
        });
    } catch (e) {
        console.error(e);
        res.status(500).send("Server error");
    }
};

exports.getGallery = async (req, res) => {
    try {
        const galleryService = require('../services/gallery.service');
        const { items } = await galleryService.getAll();

        res.render("admin/pages/gallery", {
            title: "Նկարներ",
            nav_active: "gallery",
            gallery: items,
            helpers,
            url: req.url
        });

    } catch (e) {
        res.status(500).send("Server error");
    }
};

exports.getUsers = async (req, res) => {
    try {
        const userService = require('../services/user.service');

        // Pagination & Filter Logic
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 20;
        const search = (req.query.search || '').trim();
        const role = req.query.role || 'all';
        const currentUserId = req.user ? req.user.id : null;

        const { users, total } = await userService.listPaged(page, limit, search, role, currentUserId);
        const totalPages = Math.ceil(total / limit);

        if (req.xhr) {
             const tableHtml = await new Promise((resolve, reject) => {
                 req.app.render("admin/partials/users_table_body", { users }, (err, html) => {
                     if (err) reject(err);
                     else resolve(html);
                 });
             });
             const paginationHtml = await new Promise((resolve, reject) => {
                 req.app.render("admin/partials/pagination", { 
                    pagination: { page, limit, totalItems: total, totalPages },
                    filters: { search, role }
                 }, (err, html) => {
                     if (err) reject(err);
                     else resolve(html);
                 });
             });
             return res.json({ table: tableHtml, pagination: paginationHtml });
        }

        // Fetch counts in parallel (Pattern #2: Efficient Queries)
        const [studentCount, adminCount, teamCount] = await Promise.all([
            userService.countByRole('student'),
            userService.countByRole('admin'),
            userService.countByRole('team-member')
        ]);

        res.render("admin/pages/users", {
            title: "Օգտատերեր",
            nav_active: "users",
            users,
            studentCount,
            adminCount,
            teamCount,
            url: req.url,
            pagination: {
                page,
                totalPages,
                totalItems: total
            },
            filters: {
                search,
                role
            }
        });

    } catch (e) {
        console.error(e);
        res.status(500).send("Server error");
    }
};


exports.getFaqs = async (req, res) => {
    try {
        const faqService = require('../services/faq.service');
        const { faqs } = await faqService.getAll();
        res.render("admin/pages/faqs", {
            title: "ՀՏՀ",
            nav_active: "faq",
            page: req.url,
            faqs
        });
    } catch (e) {
        res.status(500).send("Server error");
    }
};

exports.getContacts = async (req, res) => {
    try {
        const contactService = require('../services/contact.service');
        let contact;
        try {
            ({ contact } = await contactService.get());
        } catch (err) {
            if (err && err.statusCode === 404) {
                contact = {
                    companyName: '',
                    phone: '',
                    email: '',
                    address: '',
                    mapsAddress: '',
                    workingHours: [],
                    facebook: '',
                    instagram: ''
                };
            } else {
                throw err;
            }
        }

        let wh = contact.workingHours;
        if (typeof wh === "string") {
            try { wh = JSON.parse(wh); } catch { wh = []; }
        }
        if (!Array.isArray(wh)) wh = [];
        contact.workingHours = wh;

        res.render("admin/pages/contacts", {
            title: "Կոնտակտներ",
            nav_active: "contacts",
            contact,
            url: req.url
        });

    } catch (e) {
        res.status(500).send("Server error");
    }
};

exports.getRegistrations = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const { count, rows: registrations } = await Registration.findAndCountAll({
            order: [["id", "DESC"]],
            limit,
            offset
        });

        const totalPages = Math.ceil(count / limit);

        res.render("admin/pages/registrations", {
            title: "Գրանցումներ",
            nav_active: "registrations",
            registrations,
            helpers,
            url: req.url,
            pagination: {
                page,
                totalPages,
                totalItems: count
            }
        });

    } catch (e) {
        console.error(e);
        res.status(500).send("Server error");
    }
};

exports.getContactMessages = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const { count, rows: messages } = await ContactMessage.findAndCountAll({
            order: [["id", "DESC"]],
            limit,
            offset
        });

        const totalPages = Math.ceil(count / limit);

        res.render("admin/pages/contact_messages", {
            title: "Կոնտակտային նամակներ",
            nav_active: "contact_messages",
            messages,
            helpers,
            url: req.url,
            pagination: {
                page,
                totalPages,
                totalItems: count
            }
        });

    } catch (e) {
        console.error(e);
        res.status(500).send("Server error");
    }
};
