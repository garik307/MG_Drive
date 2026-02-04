const path = require('path');
process.env.UV_THREADPOOL_SIZE = 128;

const dotenv = require('dotenv');
const crypto = require('crypto');
const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const fileUpload = require('express-fileupload');
const rateLimit = require('express-rate-limit');

if (process.env.NODE_ENV !== 'production') dotenv.config({ path: './.env' });

// Redis (SAFE, optional)
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
app.disable('x-powered-by');

// 1. COMPRESSION (gzip)
app.set('trust proxy', 1);
app.use(compression({
  level: 6, // Default level is better for TTFB (speed)
  threshold: 0,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// SECURITY HEADERS (Essential for Best Practices 100)
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://maps.googleapis.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://maps.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com; frame-src 'self' https://www.google.com https://maps.googleapis.com;");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// 2. STATIC FILES
const staticOptions = {
  etag: true,
  maxAge: '1y',
  immutable: true,
  setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff')
};

app.use('/admin', express.static(path.join(__dirname, 'public', 'admin'), staticOptions));
app.use(express.static(path.join(__dirname, 'public'), staticOptions));

// 3. METRICS
app.use(metrics.middleware);

// 4. BODY PARSERS
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Enable Etags for views
app.set('etag', 'strong'); 
app.use(cookieParser());
app.use(fileUpload({ limits: { fileSize: 10 * 1024 * 1024 }}));

// VIEW ENGINE
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// LOGGING
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// RATE LIMIT (API ONLY)
const limiter = rateLimit({
  max: 5000,
  windowMs: 60 * 60 * 1000,
  message: 'Այս IP-ից չափազանց շատ հարցումներ են ուղարկվել, խնդրում ենք կրկին փորձել մեկ ժամից։'
});

const authLimiter = rateLimit({
  max: 100,
  windowMs: 60 * 1000, // 1 minute
  message: { message: 'Այս IP-ից մուտք գործելու չափազանց շատ փորձեր կան, խնդրում ենք կրկին փորձել մեկ ժամից։' }
});

const readLimiter = rateLimit({
  max: 5000, 
  windowMs: 60 * 1000,
  message: { message: 'Չափազանց շատ ընթերցման հարցումներ կան, խնդրում ենք կրկին փորձել մեկ ժամից։' }
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
  if (req.originalUrl.startsWith('/api')) res.set('Cache-Control', 'no-store');
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

  const fingerprint = crypto.createHash('sha1').update(`${ip}|${ua}`).digest('hex');

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
  if (req.originalUrl.startsWith('/api')) return next(new AppError(`Հնարավոր չէ գտնել ${req.originalUrl}-ը այս սերվերի վրա!`, 404));

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
