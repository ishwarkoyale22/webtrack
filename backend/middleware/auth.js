const Admin = require('../models/Admin');

/**
 * WebTrack has no login screen — it's a single-admin local tool. This
 * middleware doesn't check for a token; it just makes sure the one admin
 * record exists (creating it from the ADMIN_* env vars on first run) and
 * attaches it to req.admin, so routes that read req.admin (settings,
 * activity attribution, profile) keep working unchanged.
 */
module.exports = function attachAdmin(req, res, next) {
  try {
    let admin = Admin.findFirst();
    if (!admin) {
      admin = Admin.create({
        name: process.env.ADMIN_NAME || 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@webtrack.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
      });
    }
    req.admin = Admin.shape(admin);
    return next();
  } catch (err) {
    return next(err);
  }
};
