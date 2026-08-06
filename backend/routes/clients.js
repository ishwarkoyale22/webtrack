const express = require('express');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Payment = require('../models/Payment');
const Domain = require('../models/Domain');
const Activity = require('../models/Activity');
const { logActivity } = require('../utils/activity');
const { attachRelations } = require('../utils/populate');
const { checkAndTriggerPaidWebhook } = require('../utils/webhook');

const router = express.Router();

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/clients
 * Query: search, stage, paymentStatus, source, from, to, sort, page, limit
 */
router.get('/', (req, res, next) => {
  try {
    const {
      search = '', stage = '', paymentStatus = '', source = '',
      from = '', to = '', sort = '-createdAt', page = 1, limit = 0,
    } = req.query;

    const filter = {};
    if (search.trim()) {
      const rx = new RegExp(escapeRx(search.trim()), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { company: rx }];
    }
    if (source) filter.source = source;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from).toISOString();
      if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`).toISOString();
    }

    let clients = Client.find(filter, { sort }).map(attachRelations);

    if (stage) clients = clients.filter((c) => c.project?.stage === stage);
    if (paymentStatus) clients = clients.filter((c) => (c.payment?.status || 'Pending') === paymentStatus);

    const total = clients.length;
    const lim = Number(limit) || 0;
    const pg = Math.max(Number(page) || 1, 1);
    const paged = lim > 0 ? clients.slice((pg - 1) * lim, pg * lim) : clients;

    res.json({ total, page: pg, limit: lim, clients: paged });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/clients
 * Creates the client plus its single project / payment ledger / domain record.
 */
router.post('/', (req, res, next) => {
  try {
    const body = req.body || {};
    const client = Client.create(body);

    Project.create(client._id, {
      websiteName: body.websiteName || `${client.name} Website`,
      websiteUrl: body.websiteUrl,
      stage: body.stage,
      deadline: body.deadline,
      priority: body.priority,
      notes: body.projectNotes,
    });
    const initialReceived = Number(body.receivedAmount ?? body.received) || 0;
    Payment.create(client._id, {
      totalPrice: body.totalPrice,
      gstEnabled: body.gstEnabled,
      gstRate: body.gstRate,
      dueDate: body.dueDate,
      ...(initialReceived > 0
        ? {
            history: [
              {
                amount: initialReceived,
                date: new Date().toISOString(),
                method: 'UPI',
                note: 'Advance payment received',
              },
            ],
          }
        : {}),
    });
    Domain.create(client._id, {
      domainName: body.domainName,
      price: body.domainPrice,
      provider: body.provider,
      purchaseDate: body.purchaseDate,
      expiryDate: body.expiryDate,
    });

    logActivity(client._id, {
      type: 'client',
      action: 'Client created',
      message: `${client.name} was added as a new client (source: ${client.source}).`,
    });

    checkAndTriggerPaidWebhook(client._id);

    res.status(201).json(attachRelations(client));
  } catch (err) {
    next(err);
  }
});

/** GET /api/clients/:id — everything the Client Detail page needs, in one call. */
router.get('/:id', (req, res, next) => {
  try {
    const client = Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const activities = Activity.forClient(client._id, 200);
    return res.json({ ...attachRelations(client), activities });
  } catch (err) {
    return next(err);
  }
});

/** PUT /api/clients/:id */
router.put('/:id', (req, res, next) => {
  try {
    const client = Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const { changed } = Client.update(client, req.body || {});

    if (changed.length) {
      const isNoteOnly = changed.length === 1 && changed[0] === 'notes';
      logActivity(client._id, {
        type: isNoteOnly ? 'note' : 'client',
        action: isNoteOnly ? 'Notes updated' : 'Client details updated',
        message: isNoteOnly ? 'Client notes were updated.' : `Updated: ${changed.join(', ')}.`,
        meta: { changed },
      });
    }

    return res.json(attachRelations(client));
  } catch (err) {
    return next(err);
  }
});

/** DELETE /api/clients/:id — removes the client and every record attached to it. */
router.delete('/:id', (req, res, next) => {
  try {
    const client = Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    Client.deleteCascade(client._id);
    return res.json({ message: `${client.name} and all related records were deleted`, _id: client._id });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/clients/:id/activities */
router.get('/:id/activities', (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json(Activity.forClient(req.params.id, limit));
  } catch (err) {
    next(err);
  }
});

/** POST /api/clients/:id/activities — manual log entry. */
router.post('/:id/activities', (req, res, next) => {
  try {
    const { action, message = '', type = 'note' } = req.body || {};
    if (!action) return res.status(400).json({ message: 'Action is required' });
    if (!Client.findById(req.params.id)) return res.status(404).json({ message: 'Client not found' });

    return res.status(201).json(Activity.create({ client: req.params.id, type, action, message }));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
