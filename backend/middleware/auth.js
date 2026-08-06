const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

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
