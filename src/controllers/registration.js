const DB = require('../models');

const { Registration } = DB.models;
const { jobQueue } = require('../utils/queue');
const Email = require('../utils/Email');

module.exports = {
    createRegistration: async (req, res) => {
        try {
            const registerCourse = await Registration.create(req.body);

            // 🔥 Fire-and-forget
            const URL = `${req.protocol}://${req.get('host')}/admin`;
            await jobQueue.add('sendEmail', {
                user: {}, // Admin notification
                url: URL,
                data: registerCourse, // Pass created object
                template: 'registerCourse', 
                subject: 'New Course Registration'
            }, {
                attempts: 3,
                removeOnComplete: true
            });

            res.status(201).json({
                status: 'success',
                registerCourse,
                time: `${Date.now() - req.time} ms`
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({
                message: 'Internal server error!'
            });
        }
    },
    getRegistration: async (req, res) => {
        try {
            const registrations = await Registration.findAll();

            if (!registrations) {
                return res.status(404).json({ message: 'Registration not found!' });
            }
            res.status(200).json({
                status: 'success',
                time: `${Date.now() - req.time} ms`,
                registrations
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({
                message: 'Internal server error!'
            });
        }
    },
    updateRegistration: async (req, res) => {
        try {
            const registration = await Registration.findByPk(req.params.id);
            if (!registration) {
                return res.status(404).json({ message: 'Registration not found!' });
            }

            for (let key in req.body) {
                registration[key] = req.body[key];
            }
            await registration.save();

            res.status(200).json({
                status: 'success',
                time: `${Date.now() - req.time} ms`,
                registration
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({
                message: 'Internal server error!'
            });
        }
    },
    deleteRegistration: async (req, res) => {
        try {
            const registration = await Registration.findByPk(req.params.id);
            if (!registration) {
                return res.status(404).json({ message: 'Registration not found!' });
            }
            await registration.destroy();
            res.status(200).json({
                message: 'Registration deleted successfully!'
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({
                message: 'Internal server error!'
            });
        }
    }
};
