const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * Requires a valid Bearer JWT (issued by POST /api/auth/login). Attaches
 * the authenticated admin to req.admin. Missing/expired/invalid tokens are
 * rejected with 401 — the frontend interceptor catches that and redirects
 * to /login.
 */
module.exports = function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Not authorised — no token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = Admin.findById(decoded.id);
    if (!admin) return res.status(401).json({ message: 'Account no longer exists' });
    req.admin = Admin.shape(admin);
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired — please log in again' });
  }
};
