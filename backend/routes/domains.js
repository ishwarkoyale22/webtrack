const express = require('express');
const Domain = require('../models/Domain');
const Client = require('../models/Client');
const { logActivity } = require('../utils/activity');
const { clientRef } = require('../utils/populate');

const router = express.Router();

/** GET /api/domains */
router.get('/', (req, res, next) => {
  try {
    const domains = Domain.find({}, { sort: 'expiryDate' }).map((d) => ({
      ...d,
      client: clientRef(d.client, ['name', 'email']),
    }));
    res.json(domains);
  } catch (err) {
    next(err);
  }
});

/** GET /api/domains/client/:clientId */
router.get('/client/:clientId', (req, res, next) => {
  try {
    const domain = Domain.findByClient(req.params.clientId);
    if (!domain) return res.status(404).json({ message: 'Domain record not found' });
    return res.json(domain);
  } catch (err) {
    return next(err);
  }
});

/** PUT /api/domains/client/:clientId — upsert. */
router.put('/client/:clientId', (req, res, next) => {
  try {
    const client = Client.findById(req.params.clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    let domain = Domain.findByClient(client._id);
    const before = domain?.domainName || '';
    if (!domain) domain = Domain.create(client._id, req.body || {});
    else Domain.update(domain, req.body || {});

    logActivity(client._id, {
      type: 'domain',
      action: before ? 'Domain updated' : 'Domain added',
      message: domain.domainName
        ? `Domain set to ${domain.domainName} (₹${domain.price}).`
        : 'Domain details updated.',
    });

    return res.json(domain);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
