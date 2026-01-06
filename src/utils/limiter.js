const rateLimit = require('express-rate-limit');
const AppError = require('./appError');

const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: {
        status: 'fail',
        message: 'Too many login attempts from this IP, please try again in an hour'
    },
    handler: (req, res, next, options) => {
        next(new AppError(options.message.message, 429));
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = { loginLimiter };
