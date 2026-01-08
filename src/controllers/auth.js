const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { jobQueue } = require('../utils/queue');
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('../utils/Email');
const Validator = require('../utils/validation');

const DB = require('../models');
const { User } = DB.models;
const { Op } = DB.Sequelize;

const createSendToken = async (user, statusCode, req, res, target = false) => {
    // Generate random login token
    const loginToken = crypto.randomBytes(32).toString('hex');
    user.login_token = loginToken;
    await user.save({ validateBeforeSave: false });

    // Determine JWT expiry 
    const jwtExpire = req.body.remember == 'on' ? 60 : 1;
    const token = jwt.sign({
        id: user.id,
        role: user.role,
        login_token: loginToken
    }, process.env.JWT_SECRET, {
        expiresIn: jwtExpire + 'd'
    });

    // Set cookie options for JWT token
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const cookieOptions = {
        expires: new Date(Date.now() + jwtExpire * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production' ? Boolean(isHttps) : false
    }

    // Attach JWT token to response as cookie
    res.cookie('jwt', token, cookieOptions);

    // Attach JWT token to response local variable
    res.locals.token = token;

    // Conditionally handle API response or redirect
    if (!target) {
        // Remove sensitive data from user object
        user.password = undefined;
        user.deleted = undefined;

        // Send response as JSON containing status, response time, JWT token and user data
        res.status(statusCode).json({
            status: 'success',
            time: (Date.now() - req.time) + ' ms',
            token,
            user
        });
    }
};

const logOutUser = (res) => {
    // Set cookie expiry to 2 seconds from now
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 2 * 1000),
        httpOnly: true
    });

    res.status()
};

module.exports = {
    // SignUp method, wrapped in catchAsync to handle exceptions
    signUp: catchAsync(async (req, res, next) => {
        // 1. Validation Layer (DTO)
        const validator = new Validator(req.body);
        validator
            .required('email', 'Email')
            .email('email')
            .required('password', 'Password')
            .min('password', 6, 'Password')
            .required('phone', 'Phone')
            .phone('phone')
            .required('name', 'Name')
            .validate();

        // 2. Optimistic Concurrency Control (No pre-checks)
        // We rely on DB unique constraints to catch duplicates.
        // This saves 2 round-trip queries per request.
        
        try {
            const user = await User.create({
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                password: req.body.password,
                role: 'user'
            });

            await createSendToken(user, 201, req, res, true);

            user.password = undefined;
            user.deleted = undefined;

            res.status(201).json({
                status: 'success',
                time: (Date.now() - req.time) + ' ms',
                token: res.locals.token,
                user,
                reload: true
            });

        } catch (err) {
            // Handle unique constraint violation
            if (err.name === 'SequelizeUniqueConstraintError') {
                const field = err.errors?.[0]?.path;
                const msg = field === 'phone' 
                    ? 'Այս հեռախոսահամարն արդեն գրանցված է։' 
                    : 'Այս էլ․ հասցեն արդեն գրանցված է։';
                const code = field === 'phone' ? 'PHONE_EXISTS' : 'EMAIL_EXISTS';
                return next(new AppError(msg, 409, code));
            }

            // Handle validation errors from Sequelize
            if (err.name === 'SequelizeValidationError') {
                 const messages = err.errors.map(e => e.message);
                 return next(new AppError(`Validation Error: ${messages.join('. ')}`, 400, 'VALIDATION_ERROR'));
            }
            
            return next(err);
        }
    }),
    signUpByAdmin: catchAsync(async (req, res, next) => {
        try {
            const allowedRoles = ['user','student','team-member'];
            const role = String(req.body.role || '').trim();
            const name = String(req.body.name || '').trim();
            const lastName = String(req.body.last_name || '').trim();
            const phone = String(req.body.phone || '').trim();
            const email = String(req.body.email || '').trim();
            const password = String(req.body.password || '').trim();

            if (!name || !phone || !email || !password || !role) {
                return next(new AppError('Պարտադիր դաշտերը բաց են մնացել', 403));
            }
            if (!allowedRoles.includes(role)) {
                return next(new AppError('Սխալ կարգավիճակ է ընտրվել', 403));
            }

            const existingEmail = await User.findOne({ where: { email } });
            if (existingEmail) {
                return next(new AppError('Այս էլ․ հասցեն արդեն գրանցված է։', 409, 'EMAIL_EXISTS'));
            }

            const payload = {
                name: lastName ? `${name} ${lastName}` : name,
                phone,
                email,
                role,
                password
            };

            const user = await User.create(payload);
            res.status(201).json({
                status: 'success',
                time: (Date.now() - req.time) + ' ms',
                user
            });
        } catch (err) {
             // Handle unique constraint violation
             if (err.name === 'SequelizeUniqueConstraintError') {
                const field = err.errors?.[0]?.path;
                const msg = field === 'phone' 
                    ? 'Այս հեռախոսահամարն արդեն գրանցված է։' 
                    : 'Այս էլ․ հասցեն արդեն գրանցված է։';
                const code = field === 'phone' ? 'PHONE_EXISTS' : 'EMAIL_EXISTS';
                return next(new AppError(msg, 409, code));
            }

            // Handle validation errors from Sequelize
            if (err.name === 'SequelizeValidationError') {
                 const messages = err.errors.map(e => {
                    if (e.path === 'phone') return 'Հեռախոսահամարը պետք է լինի 0-ով սկսվող 9 նիշ (օր․ 091234567)';
                    if (e.path === 'email') return 'Էլ․ հասցեն սխալ է';
                    return e.message;
                 });
                 return next(new AppError(`${messages.join('. ')}`, 400, 'VALIDATION_ERROR'));
            }
            
            return next(err);
        }
    }),
    logOut: catchAsync(async (req, res, next) => {
        // Set cookie expiry to 2 seconds from now
        res.cookie('jwt', 'loggedout', {
            expires: new Date(Date.now() + 500),
            httpOnly: true
        });

        // If request accepts HTML (browser form submit), redirect to home
        if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return res.redirect('/');
        }

        // Return success response for API clients
        res.status(200).json({
            status: 'success',
            message: 'Օգտատերը դուրս է եկել հաշվից',
            redirect: '/'
        });
    }),
    signIn: catchAsync(async (req, res, next) => {
        const { email, password } = req.body;

        // 1. Validate Input
        const validator = new Validator(req.body);
        validator.required('email').required('password').validate();

        // 2. Check if user exists && password is correct
        const user = await User.findOne({ where: { email } });

        // Generic error message for security
        const authErr = new AppError('Սխալ էլ․ հասցե կամ գաղտնաբառ', 401);

        if (!user) return next(authErr);
        
        // Async bcrypt compare
        if (!(await user.correctPassword(password, user.password))) {
            return next(authErr);
        }

        // 3. Send token
        await createSendToken(user, 200, req, res, true);

        res.status(200).json({
            status: 'success',
            token: res.locals.token,
            time: (Date.now() - req.time + ' ms'),
            reload: true
        });
    }),
    logout: async (req, res) => {
        // Call helper function to clear cookies and log out user
        logOutUser(res);

        // Return success message in JSON format with 200 OK status code
        res.status(200).json({
            status: 'success',
            message: 'Your successfully logged out!'
        })
    },
    restrictTo: (...roles) => {
        return (req, res, next) => {
            if (!roles.includes(req.user.role)) {
                return next(new AppError('Դուք իրավասություն չունեք կատարելու այս գործողությունը', 403));
            }
            next();
        };
    },
    forgotPassword: catchAsync(async(req, res, next) => {
        const {email} = req.body;

        // 1) Check if email and password exist
        if (!email) return next(new AppError('Խնդրում ենք տրամադրել ձեր էլ. փոստը։', 400));

        // 2) Get user based on POSTed email
        const user = await User.findOne({where: { email }});

        if (!user)  return next(new AppError('Օգտվողը չի գտնվել է։', 404));
        
        // 3) Generate the random reset token
        const resetToken = user.createPasswordResetToken();

        await user.save();

        // 4) Send it to user's email
        try {
            const resetURL = `${req.protocol}://${req.get('host')}/resetPassword/${resetToken}`;
            
            // Send directly to avoid Redis dependency issues
            await new Email(user, resetURL).sendPasswordReset();

            res.status(200).json({
                status: 'success',
                message: 'Վերականգնման կոդը ուղարկել ենք էլ․ հասցեին'
            });
        } catch (err) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return next(new AppError('There was an error sending the email. Try again later!'), 500);
        }
    }),
    resetPassword: catchAsync(async(req, res, next) => {
        // 1) Get user based on the token
        const hashedToken = crypto
            .createHash("sha256")
            .update(req.params.token)
            .digest("hex");

        const user = await User.findOne({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpires: {
                    [Op.gt]: Date.now()
                }
            }
        });

        // 2) If token has not expired, and there is user, set the new password
        if (!user) return next(new AppError('Token is invalid or has expired', 401));

        user.password = req.body.password;
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();

        // // 3) Update changedPasswordAt property for the user (hook) // 4) Log the
        // user in, send JWT createSendToken(user, 200, req, res);
        // createSendToken(user, 200, req, res, true);
        res.status(200).json({
            status: 'success',
            message: 'Գաղտնաբառը հաջողությամբ վերականգնվեց'
        })
    }),
    /* Security */
    isLoggedIn: async (req, res, next) => {
        res.locals.user = undefined;

        if (req.cookies.jwt) {
            try {
                // Logout user by X-RateLimit-Remaining
                if (res.getHeader('x-ratelimit-remaining') == 0) {
                    // logoutUser(res);
                }
                // 1) verify token
                const decoded = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);

                // 2) Check if user still exists
                const currentUser = await User.findByPk(decoded.id, {include: "files"});
                if (!currentUser) {
                    res.clearCookie('jwt');
                    return next();
                }

                // 3) Check if user changed password after the token was issued
                if (currentUser.changedPasswordAfter(decoded.iat)) {
                    res.clearCookie('jwt');
                    return next();
                }

                // 4) Check if login token matches (single device login) only if both exist
                if (decoded.login_token && currentUser.login_token && currentUser.login_token !== decoded.login_token) {
                    res.clearCookie('jwt');
                    return next();
                }

                // THERE IS A LOGGED IN USER
                req.user = currentUser;
                res.locals.user = currentUser.toJSON();
                return next();
            } catch (err) {
                return next();
            }
        }
        next();
    },
    updatePassword: catchAsync(async (req, res, next) => {
        // 1) Get user from collection
        const user = await User.findByPk(req.user.id, { attributes: ['id', 'password', 'login_token', 'role'] });

        // 2) Check if POSTed current password is correct
        if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
            return next(new AppError('Ընթացիկ գաղտնաբառը սխալ է', 401));
        }

        // 3) If so, update password
        user.password = req.body.password;
        user.passwordConfirm = req.body.passwordConfirm;
        await user.save();

        // 4) Log user in, send JWT
        createSendToken(user, 200, req, res);
    }),

    // Protect routes that require authentication
    protect: catchAsync(async (req, res, next) => {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies.jwt) {
            token = req.cookies.jwt
        }

        if (!token) {
            if (req.originalUrl && req.originalUrl.startsWith('/api')) {
                return next(new AppError('Խնդրում ենք մուտք գործել որպես ադմին', 401));
            }
            return res.redirect('/');
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) {
            if (req.originalUrl && req.originalUrl.startsWith('/api')) {
                return next(new AppError('Invalid token. Please log in again.', 401));
            }
            return res.redirect('/');
        }

        // 3) Check if user still exists
        const currentUser = await User.findByPk(decoded.id);
        if (!currentUser) {
            res.clearCookie('jwt');
            if (req.originalUrl && req.originalUrl.startsWith('/api')) {
                return next(new AppError('The user belonging to this token no longer exists.', 401));
            }
            return res.redirect('/');
        }

        // 4) Check if user changed password after the token was issued
        if (currentUser.changedPasswordAfter(decoded.iat)) {
            res.clearCookie('jwt');
            if (req.originalUrl && req.originalUrl.startsWith('/api')) {
                return next(new AppError('User recently changed password! Please log in again.', 401));
            }
            return res.redirect('/');
        }

        // GRANT ACCESS TO PROTECTED ROUTE
        req.user = currentUser;
        res.locals.user = currentUser;

        next();
    }),
    protectUser: (req, res, next) => {
        // Check if user is already logged in by checking res.locals object
        if (res.locals.user) {
            return res.redirect('/');
        }
        // Otherwise, move to next middleware function
        next();
    }
}
