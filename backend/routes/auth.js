const express = require('express');
const protect = require('../middleware/auth');
const Admin = require('../models/Admin');

const router = express.Router();

/** GET /api/auth/me — the single admin's profile (no login required). */
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

/** PUT /api/auth/password — change the stored admin password. */
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

module.exports = router;
