require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const store = require('./store');
const protect = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Uploaded before/after screenshots
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'webtrack-api', time: new Date().toISOString() }));

// Every request starts with a fresh read, so no request ever serves data
// left over from a different (or stale) serverless instance.
app.use(async (req, res, next) => {
  try {
    await store.reload();
    next();
  } catch (err) {
    next(err);
  }
});

// Any writes made while handling a request must be durably saved before the
// response goes out — a serverless function can freeze right after res.json().
app.use((req, res, next) => {
  const send = res.json.bind(res);
  res.json = (body) => {
    store
      .flushPending()
      .then(() => send(body))
      .catch((err) => {
        console.error('💾  Failed to persist changes before responding:', err.message);
        send(body); // still respond — never strand the user on a hang
      });
    return res;
  };
  next();
});

app.use('/api/auth', require('./routes/auth'));

// No login required — `protect` just attaches the single admin record.
app.use('/api/clients', protect, require('./routes/clients'));
app.use('/api/projects', protect, require('./routes/projects'));
app.use('/api/payments', protect, require('./routes/payments'));
app.use('/api/domains', protect, require('./routes/domains'));
app.use('/api/reports', protect, require('./routes/reports').router);
app.use('/api/notifications', protect, require('./routes/notifications'));
app.use('/api/team', protect, require('./routes/team'));
app.use('/api/documents', protect, require('./routes/documents'));

// Serve the built frontend in production (single-service deploy)
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Local dev: wait for the first data load before accepting connections.
// On Vercel this line still runs once per cold start (harmless — the
// reload-before-every-request middleware above is what actually keeps data
// fresh there), @vercel/node calls the exported app directly either way.
store
  .init()
  .then(() => app.listen(PORT, () => console.log(`🚀  WebTrack API listening on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('💥  Failed to initialize the data store:', err.message);
    process.exit(1);
  });

module.exports = app;
