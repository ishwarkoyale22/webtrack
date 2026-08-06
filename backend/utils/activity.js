const Activity = require('../models/Activity');

/**
 * Fire-and-forget activity logger — a failed log must never break the request.
 */
async function logActivity(clientId, { type = 'client', action, message = '', meta = {}, by = 'Admin' }) {
  try {
    return Activity.create({ client: clientId, type, action, message, meta, by });
  } catch (err) {
    console.error('activity-log failed:', err.message);
    return null;
  }
}

module.exports = { logActivity };
