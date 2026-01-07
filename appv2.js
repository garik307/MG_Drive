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

dotenv.config({ path: './.env' });

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

/* ======================================================
   🔥 CORE SETTINGS (MUST BE FIRST)
====================================================== */

// Railway = 1 proxy (Cloudflare + Railway => 2)
app.set('trust proxy', 1);
app.use(compression());

/* ======================================================
   STATIC FILES
====================================================== */

const staticOptions = {
  etag: true,
  maxAge: '1d',
  setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff')
};

app.use('/admin', express.static(path.join(__dirname, 'public', 'admin'), staticOptions));
app.use(express.static(path.join(__dirname, 'public'), staticOptions));

/* ======================================================
   METRICS (ONLY DYNAMIC)
====================================================== */

app.use(metrics.middleware);

/* ======================================================
   BODY PARSERS
====================================================== */

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(fileUpload({ limits: { fileSize: 10 * 1024 * 1024 } }));

/* ======================================================
   VIEW ENGINE
====================================================== */

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('etag', 'strong');

/* ======================================================
   LOGGING
====================================================== */

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/* ======================================================
   RATE LIMITERS (SAFE)
====================================================== */

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => !req.ip,
  message: 'Չափազանց շատ հարցումներ։ Փորձեք ավելի ուշ։'
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => !req.ip,
  message: { message: 'Չափազանց շատ մուտքի փորձեր։ Փորձեք ավելի ուշ։' }
});

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => !req.ip,
  message: { message: 'Չափազանց շատ հարցումներ' }
});

// Apply limiters
app.use('/api/v1/users/login', authLimiter);
app.use('/api/v1/tests', readLimiter);
app.use('/api', limiter);

/* ======================================================
   REQUEST TIME
====================================================== */

app.use((req, res, next) => {
  req.time = Date.now();
  next();
});

/* ======================================================
   CACHE CONTROL (API)
====================================================== */

app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

/* ======================================================
   VISITOR TRACKING (REDIS OPTIONAL, NON-BLOCKING)
====================================================== */

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

/* ======================================================
   API ROUTES
====================================================== */

Api(app);

/* ======================================================
   404 HANDLER
====================================================== */

app.all('*', async (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next(new AppError(`Can't find ${req.originalUrl}`, 404));
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

/* ======================================================
   GLOBAL ERROR HANDLER
====================================================== */

app.use(globalErrorHandler);

/* ======================================================
   START SERVER
====================================================== */

Server(app);
