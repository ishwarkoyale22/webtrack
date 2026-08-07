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
 * The single admin account is provisioned from ADMIN_* env vars the first
 * time anyone logs in (works the same whether the store is a fresh local
 * file or a fresh Supabase project — no separate seed step required).
 */
function ensureAdmin() {
  let admin = Admin.findFirst();
  if (!admin) {
    admin = Admin.create({
      name: process.env.ADMIN_NAME || 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@webtrack.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    });
  }
  return admin;
}

/** POST /api/auth/login */
router.post('/login', loginLimiter, (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    ensureAdmin();
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

/** POST /api/auth/logout — JWT is stateless; the client just drops the token. */
router.post('/logout', protect, (req, res) => res.json({ message: 'Logged out' }));

module.exports = router;
