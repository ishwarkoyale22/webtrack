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

app.use('/api/auth', require('./routes/auth'));

// No login required — `protect` just attaches the single admin record.
app.use('/api/clients', protect, require('./routes/clients'));
app.use('/api/projects', protect, require('./routes/projects'));
app.use('/api/payments', protect, require('./routes/payments'));
app.use('/api/domains', protect, require('./routes/domains'));
app.use('/api/reports', protect, require('./routes/reports').router);
app.use('/api/notifications', protect, require('./routes/notifications'));
app.use('/api/team', protect, require('./routes/team'));

// Serve the built frontend in production (single-service deploy)
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// File-backed JSON store — no database server needed.
store.init();
app.listen(PORT, () => console.log(`🚀  WebTrack API listening on http://localhost:${PORT}`));

module.exports = app;
