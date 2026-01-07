const path = require('path');
process.env.UV_THREADPOOL_SIZE = 128;

const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const fileUpload = require('express-fileupload');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

if (process.env.NODE_ENV !== 'production') dotenv.config({ path: './.env' });

// 🔥 Redis (SAFE, optional)
const redis = require('./src/utils/redisClient');

const Server = require('./src/utils/server');
const Api = require('./src/utils/api');
const ctrls = require('./src/controllers');
const globalErrorHandler = ctrls.error;
const metrics = require('./src/utils/metrics');
const AppError = require('./src/utils/appError');
const DB = require('./src/models');
const { Contact } = DB.models;

const app = express();

// 1. COMPRESSION 
app.set('trust proxy', 1);
app.use(compression());


// 2. STATIC FILES
const staticOptions = {
  etag: true,
  // Cache for 1 day
  maxAge: '1d', 
  setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff')
};

app.use('/admin', express.static(path.join(__dirname, 'public', 'admin'), staticOptions));
app.use(express.static(path.join(__dirname, 'public'), staticOptions));

// 3. METRICS (Only for dynamic API/View requests)
app.use(metrics.middleware);

// 4. BODY PARSERS
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.set('etag', 'strong'); // Enable Etags for views
app.use(cookieParser());
app.use(fileUpload({ limits: { fileSize: 10 * 1024 * 1024 }}));

// VIEW ENGINE
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// LOGGING
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// RATE LIMIT (API ONLY)
const limiter = rateLimit({
  max: 5000, // Increased for Load Testing (50 VUs)
  windowMs: 60 * 60 * 1000,
  message: 'Այս IP-ից չափազանց շատ հարցումներ են ուղարկվել, խնդրում ենք կրկին փորձել մեկ ժամից։'
});

const authLimiter = rateLimit({
    max: 100, // Increased for Load Testing
    windowMs: 60 * 1000, // 1 minute
    message: { message: 'Այս IP-ից մուտք գործելու չափազանց շատ փորձեր կան, խնդրում ենք կրկին փորձել մեկ ժամից։' }
});

const readLimiter = rateLimit({
    max: 5000, // Increased for Load Testing (50 VUs * 60s = 3000 reqs)
    windowMs: 60 * 1000, // 1 minute
    message: { message: 'Չափազանց շատ ընթերցման հարցումներ' }
});


// Apply limiters
app.use('/api/v1/users/login', authLimiter);
app.use('/api/v1/tests', readLimiter); 

app.use('/api', limiter);

// REQUEST TIME
app.use((req, res, next) => {
  req.time = Date.now();
  next();
});

// CACHE CONTROL
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

// VISITOR TRACKING (SAFE)
app.use((req, res, next) => {
  if (
    !redis ||
    req.originalUrl.startsWith('/api') ||
    req.originalUrl.startsWith('/admin') ||
    !req.accepts('html')
  ) {
    return next();
  }

  const dateKey = new Date().toISOString().slice(0, 10);
  const ip = req.ip || '';
  const ua = req.headers['user-agent'] || '';

  const fingerprint = crypto
    .createHash('sha1')
    .update(`${ip}|${ua}`)
    .digest('hex');

  redis.sAdd(`visitors:${dateKey}`, fingerprint).catch(() => {});
  redis.incr(`visits:${dateKey}`).catch(() => {});
  redis.expire(`visitors:${dateKey}`, 3 * 24 * 60 * 60).catch(() => {});
  redis.expire(`visits:${dateKey}`, 3 * 24 * 60 * 60).catch(() => {});

  next();
});

// API ROUTES
Api(app);

// 404 HANDLER
app.all('*', async (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  }

  const contact = await Contact.findOne();
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  res.status(404).render('./notFount/404', {
    title: 'Էջը չի գտնվել (404)',
    description: 'Հասցեն գոյություն չունի կամ տեղափոխվել է',
    canonical: url,
    og_image: './images/404.jpg',
    nav_active: '404',
    page: req.path,
    contact
  });
});

// GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

// START SERVER
Server(app);
