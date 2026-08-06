const store = require('../store');
const Payment = require('../models/Payment');

/** Trimmed client reference, like a Mongoose populate('client', 'name email …'). */
function clientRef(clientId, fields = ['name', 'email', 'phone', 'source', 'createdAt']) {
  const c = store.clients.findById(clientId);
  if (!c) return null;
  const out = { _id: c._id };
  fields.forEach((f) => {
    out[f] = c[f];
  });
  return out;
}

/** Client + its single project / payment (with derived totals) / domain. */
function attachRelations(client) {
  const id = String(client._id);
  return {
    ...client,
    project: store.projects.findOne({ client: id }),
    payment: Payment.withTotals(store.payments.findOne({ client: id })),
    domain: store.domains.findOne({ client: id }),
  };
}

module.exports = { clientRef, attachRelations };
