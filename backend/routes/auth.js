const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/Admin');
const protect = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

/**
 * POST /api/auth/register
 * Only usable while no admin exists — this is a single-admin panel.
 */
router.post('/register', (req, res, next) => {
  try {
    if (Admin.count() > 0) {
      return res.status(403).json({ message: 'An admin already exists. Registration is closed.' });
    }
    const admin = Admin.create(req.body || {});
    return res.status(201).json({ token: signToken(admin._id), admin: Admin.shape(admin) });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/auth/status — does an admin account exist yet? (drives the login screen) */
router.get('/status', (req, res) => res.json({ hasAdmin: Admin.count() > 0 }));

/**
 * POST /api/auth/auto-login
 * With AUTO_LOGIN=true the panel opens directly — no login screen on first
 * visit. The single admin account is issued a token straight away (created
 * from the ADMIN_* env values if it doesn't exist yet). The /login page
 * remains for explicit sign-in after a logout, or set AUTO_LOGIN=false to
 * always require email + password.
 */
router.post('/auto-login', (req, res, next) => {
  try {
    if (String(process.env.AUTO_LOGIN).toLowerCase() !== 'true') {
      return res.status(403).json({ message: 'Auto-login is disabled' });
    }

    let admin = Admin.findFirst();
    if (!admin) {
      admin = Admin.create({
        name: process.env.ADMIN_NAME || 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@webtrack.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
      });
    }

    return res.json({ token: signToken(admin._id), admin: Admin.shape(admin) });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/auth/login */
router.post('/login', loginLimiter, (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const admin = Admin.findByEmail(email);
    if (!admin || !Admin.verifyPassword(admin, password)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.json({ token: signToken(admin._id), admin: Admin.shape(admin) });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/auth/me */
router.get('/me', protect, (req, res) => res.json(req.admin));

/**
 * PUT /api/auth/profile — profile + settings update.
 * Password changes go through /password so the current password is always verified.
 */
router.put('/profile', protect, (req, res, next) => {
  try {
    const admin = Admin.findById(req.admin._id);
    Admin.updateProfile(admin, req.body || {});
    return res.json(Admin.shape(admin));
  } catch (err) {
    return next(err);
  }
});

/** PUT /api/auth/password */
router.put('/password', protect, (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const admin = Admin.findById(req.admin._id);
    if (!Admin.verifyPassword(admin, currentPassword)) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    Admin.setPassword(admin, newPassword);
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/auth/logout — JWT is stateless; the client drops the token. */
router.post('/logout', protect, (req, res) => res.json({ message: 'Logged out' }));

module.exports = router;
