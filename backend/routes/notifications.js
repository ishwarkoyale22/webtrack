const express = require('express');
const { buildAlerts, loadLedgers, loadProjects, loadDomains } = require('./reports');

const router = express.Router();

/**
 * GET /api/notifications
 * Payment-due reminders, project deadline alerts and domain expiry warnings —
 * the same feed the dashboard and the bell icon render.
 */
router.get('/', (req, res, next) => {
  try {
    const alerts = buildAlerts({
      ledgers: loadLedgers(),
      projects: loadProjects(),
      domains: loadDomains(),
      settings: req.admin?.settings,
    });

    res.json({
      count: alerts.length,
      unreadCritical: alerts.filter((a) => a.severity === 'critical').length,
      alerts,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
