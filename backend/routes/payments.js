const express = require('express');
const dayjs = require('dayjs');
const Payment = require('../models/Payment');
const Client = require('../models/Client');
const Activity = require('../models/Activity');
const { logActivity } = require('../utils/activity');
const { clientRef } = require('../utils/populate');
const { derivePayment } = require('../utils/money');
const { checkAndTriggerPaidWebhook } = require('../utils/webhook');

const router = express.Router();

/** GET /api/payments — every ledger, with client info (payment report / export). */
router.get('/', (req, res, next) => {
  try {
    const { status = '', from = '', to = '' } = req.query;

    let rows = Payment.find().map((p) => ({
      ...p,
      ...derivePayment(p),
      client: clientRef(p.client),
    }));

    if (status) rows = rows.filter((r) => r.status === status);
    if (from || to) {
      const start = from ? new Date(from) : new Date(0);
      const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date(8640000000000000);
      rows = rows.map((r) => {
        const history = (r.history || []).filter((h) => {
          const d = new Date(h.date);
          return d >= start && d <= end;
        });
        return { ...r, history, ...derivePayment({ ...r, history }) };
      });
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/** GET /api/payments/client/:clientId */
router.get('/client/:clientId', (req, res, next) => {
  try {
    const payment = Payment.findByClient(req.params.clientId);
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });
    return res.json(Payment.withTotals(payment));
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/payments/client/:clientId
 * Updates the deal terms (total price, GST toggle, due date). Upserts if missing.
 * Received / pending / status are always derived — they can never be set directly.
 */
router.put('/client/:clientId', (req, res, next) => {
  try {
    const client = Client.findById(req.params.clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    let payment = Payment.findByClient(client._id);
    if (!payment) payment = Payment.create(client._id);

    const before = { totalPrice: payment.totalPrice, gstEnabled: payment.gstEnabled, status: derivePayment(payment).status };
    Payment.update(payment, req.body || {});
    const after = derivePayment(payment);

    const notes = [];
    if (before.totalPrice !== payment.totalPrice) notes.push(`total price ${before.totalPrice} → ${payment.totalPrice}`);
    if (before.gstEnabled !== payment.gstEnabled) notes.push(`GST turned ${payment.gstEnabled ? 'on' : 'off'}`);

    logActivity(client._id, {
      type: 'payment',
      action: 'Payment details updated',
      message: notes.length ? `Updated ${notes.join(', ')}.` : 'Payment terms were updated.',
      meta: { status: after.status },
    });

    if (before.status !== after.status) {
      logActivity(client._id, {
        type: 'status',
        action: 'Payment status changed',
        message: `Status is now ${after.status}.`,
        meta: { from: before.status, to: after.status },
      });
    }

    checkAndTriggerPaidWebhook(client._id);

    return res.json(Payment.withTotals(payment));
  } catch (err) {
    return next(err);
  }
});

/** POST /api/payments/client/:clientId/entry — record a received payment. */
router.post('/client/:clientId/entry', (req, res, next) => {
  try {
    const payment = Payment.findByClient(req.params.clientId);
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });

    const beforeStatus = derivePayment(payment).status;
    Payment.addEntry(payment, req.body || {});
    const after = derivePayment(payment);

    const value = Number(req.body.amount);
    logActivity(payment.client, {
      type: 'payment',
      action: 'Payment received',
      message: `₹${value.toLocaleString('en-IN')} received via ${req.body.method || 'UPI'}. Pending is now ₹${after.pending.toLocaleString('en-IN')}.`,
      meta: { amount: value, method: req.body.method || 'UPI', pending: after.pending },
    });

    if (beforeStatus !== after.status) {
      logActivity(payment.client, {
        type: 'status',
        action: 'Payment status changed',
        message: `Status moved from ${beforeStatus} → ${after.status}.`,
        meta: { from: beforeStatus, to: after.status },
      });
    }

    checkAndTriggerPaidWebhook(payment.client);

    return res.status(201).json(Payment.withTotals(payment));
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/payments/client/:clientId/entry/:entryId
 * Inline edit of a recorded payment. Every change is written to the activity
 * log as "old → new" so the money trail is always auditable.
 */
router.put('/client/:clientId/entry/:entryId', (req, res, next) => {
  try {
    const payment = Payment.findByClient(req.params.clientId);
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });

    const beforeStatus = derivePayment(payment).status;
    const result = Payment.editEntry(payment, req.params.entryId, req.body || {});
    if (!result) return res.status(404).json({ message: 'Payment entry not found' });

    const { changes, before, entry } = result;
    const after = derivePayment(payment);

    if (changes.length) {
      const described = changes
        .map((c) => {
          if (c.field === 'amount') {
            return `amount ₹${Number(c.from).toLocaleString('en-IN')} → ₹${Number(c.to).toLocaleString('en-IN')}`;
          }
          if (c.field === 'date') {
            return `date ${dayjs(c.from).format('DD MMM YYYY')} → ${dayjs(c.to).format('DD MMM YYYY')}`;
          }
          return `${c.field} "${c.from || '—'}" → "${c.to || '—'}"`;
        })
        .join(', ');

      logActivity(payment.client, {
        type: 'payment',
        action: 'Payment entry edited',
        message: `Payment of ${dayjs(before.date).format('DD MMM YYYY')} updated — ${described}. Received is now ₹${after.received.toLocaleString('en-IN')}, pending ₹${after.pending.toLocaleString('en-IN')}.`,
        meta: { entryId: entry._id, changes, received: after.received, pending: after.pending },
      });
    }

    if (beforeStatus !== after.status) {
      logActivity(payment.client, {
        type: 'status',
        action: 'Payment status changed',
        message: `Status moved from ${beforeStatus} → ${after.status}.`,
        meta: { from: beforeStatus, to: after.status },
      });
    }

    checkAndTriggerPaidWebhook(payment.client);

    return res.json(Payment.withTotals(payment));
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/payments/logs
 * The payment edit trail across every client (newest first).
 */
router.get('/logs', (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const onlyEdits = String(req.query.edits) === 'true';

    const logs = Activity.find({}, { sort: '-createdAt' })
      .filter((a) => (onlyEdits ? a.action === 'Payment entry edited' : ['payment', 'status'].includes(a.type)))
      .slice(0, limit)
      .map((a) => ({ ...a, client: clientRef(a.client, ['name']) }));

    res.json(logs);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/payments/client/:clientId/entry/:entryId */
router.delete('/client/:clientId/entry/:entryId', (req, res, next) => {
  try {
    const payment = Payment.findByClient(req.params.clientId);
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });

    const entry = (payment.history || []).find((h) => String(h._id) === req.params.entryId);
    if (!entry) return res.status(404).json({ message: 'Payment entry not found' });

    Payment.removeEntry(payment, req.params.entryId);

    logActivity(payment.client, {
      type: 'payment',
      action: 'Payment entry deleted',
      message: `A payment of ₹${entry.amount.toLocaleString('en-IN')} was removed from the history.`,
      meta: { amount: entry.amount },
    });

    return res.json(Payment.withTotals(payment));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
