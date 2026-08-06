const store = require('../store');
const { derivePayment } = require('../utils/money');

const METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];

const fail = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

function clean(input = {}) {
  const out = {};
  if (input.totalPrice !== undefined) out.totalPrice = Math.max(Number(input.totalPrice) || 0, 0);
  if (input.gstEnabled !== undefined) out.gstEnabled = !!input.gstEnabled;
  if (input.gstRate !== undefined) out.gstRate = Math.min(Math.max(Number(input.gstRate) || 0, 0), 100);
  if (input.dueDate !== undefined) out.dueDate = store.toDate(input.dueDate);
  return out;
}

const Payment = {
  METHODS,

  find: (filter, opts) => store.payments.find(filter, opts),

  findByClient: (clientId) => store.payments.findOne({ client: String(clientId) }),

  create(clientId, input = {}) {
    return store.payments.insert({
      client: String(clientId),
      totalPrice: 0,
      gstEnabled: false,
      gstRate: 18,
      dueDate: null,
      history: [],
      paidWebhookSent: false,
      ...clean(input),
      ...(Array.isArray(input.history)
        ? {
            history: input.history.map((h) => ({
              _id: store.oid(),
              amount: Number(h.amount) || 0,
              date: store.toDate(h.date) || store.nowIso(),
              method: METHODS.includes(h.method) ? h.method : 'UPI',
              note: String(h.note || ''),
              createdAt: store.nowIso(),
            })),
          }
        : {}),
    });
  },

  update: (doc, input) => store.payments.update(doc, clean(input)),

  addEntry(doc, { amount, date, method = 'UPI', note = '' }) {
    const value = Number(amount);
    if (!value || value <= 0) fail('Amount must be greater than 0');

    doc.history = doc.history || [];
    doc.history.push({
      _id: store.oid(),
      amount: value,
      date: store.toDate(date) || store.nowIso(),
      method: METHODS.includes(method) ? method : 'Other',
      note: String(note || ''),
      createdAt: store.nowIso(),
    });
    return store.payments.touch(doc);
  },

  /**
   * Edits one entry in place and reports what actually changed, so the
   * caller can write a precise "old → new" line into the activity log.
   */
  editEntry(doc, entryId, patch = {}) {
    const entry = (doc.history || []).find((h) => String(h._id) === String(entryId));
    if (!entry) return null;

    const before = { amount: entry.amount, date: entry.date, method: entry.method, note: entry.note };

    if (patch.amount !== undefined) {
      const value = Number(patch.amount);
      if (!value || value <= 0) fail('Amount must be greater than 0');
      entry.amount = value;
    }
    if (patch.date !== undefined) {
      const d = store.toDate(patch.date);
      if (!d) fail('Please provide a valid date');
      entry.date = d;
    }
    if (patch.method !== undefined && METHODS.includes(patch.method)) entry.method = patch.method;
    if (patch.note !== undefined) entry.note = String(patch.note || '');

    entry.updatedAt = store.nowIso();
    store.payments.touch(doc);

    const changes = [];
    if (before.amount !== entry.amount) changes.push({ field: 'amount', from: before.amount, to: entry.amount });
    if (before.date !== entry.date) changes.push({ field: 'date', from: before.date, to: entry.date });
    if (before.method !== entry.method) changes.push({ field: 'method', from: before.method, to: entry.method });
    if ((before.note || '') !== (entry.note || '')) changes.push({ field: 'note', from: before.note, to: entry.note });

    return { entry, before, changes };
  },

  removeEntry(doc, entryId) {
    const before = (doc.history || []).length;
    doc.history = (doc.history || []).filter((h) => String(h._id) !== String(entryId));
    if (doc.history.length === before) return null;
    return store.payments.touch(doc);
  },

  /** Plain document + derived figures (received / pending / status / GST). */
  withTotals: (doc) => (doc ? { ...doc, ...derivePayment(doc) } : null),
};

module.exports = Payment;
