const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const userService = require('../services/user.service');


// ---------------------- GET ALL USERS ----------------------
exports.getUsers = catchAsync(async (req, res) => {
    const { users, fromCache } = await userService.getAll({ excludeRoles: ['admin'] });
    res.status(200).json({
        status: 'success',
        fromCache,
        time: `${Date.now() - req.time} ms`,
        users
    });
});

// ---------------------- UPDATE USER ----------------------
exports.updateUser = async (req, res, next) => {
    try {
        const user = await userService.updateUser(req.params.id, req.body, req.files);
        res.status(200).json({
            status: 'success',
            time: `${Date.now() - req.time} ms`,
            user,
            reload: true
        });
    } catch (err) {
        next(err);
    }
};

exports.updateMe = async (req, res, next) => {
    try {
        const user = await userService.updateMe(req.user.id, req.body, req.files);
        res.status(200).json({
            status: 'success',
            time: `${Date.now() - req.time} ms`,
            user,
            reload: true
        });
    } catch (err) {
        next(err);
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        await userService.deleteUser(req.params.id);
        res.status(204).json({ status: 'success' });
    } catch (err) {
        next(err);
    }
};

exports.deleteAvatar = async (req, res, next) => {
    try {
        await userService.deleteAvatar(req.user.id);
        res.status(200).json({
            status: 'success',
            time: `${Date.now() - req.time} ms`,
            reload: true
        });
    } catch (err) {
        next(err);
    }
};
