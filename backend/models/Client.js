const store = require('../store');
const Document = require('./Document');

const SOURCES = ['Referral', 'Social Media', 'Direct'];
const EMAIL_RX = /^\S+@\S+\.\S+$/;

const fail = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

function clean(input = {}, { partial = false } = {}) {
  const out = {};
  const has = (k) => input[k] !== undefined;

  if (has('name') || !partial) {
    const name = String(input.name || '').trim();
    if (!name) fail('Client name is required');
    out.name = name;
  }
  if (has('phone') || !partial) {
    const phone = String(input.phone || '').trim();
    if (!phone) fail('Phone is required');
    out.phone = phone;
  }
  if (has('email')) {
    const email = String(input.email || '').toLowerCase().trim();
    if (email && !EMAIL_RX.test(email)) fail('Please provide a valid email');
    out.email = email;
  }
  if (has('source')) out.source = SOURCES.includes(input.source) ? input.source : 'Direct';
  if (has('company')) out.company = String(input.company || '').trim();
  if (has('address')) out.address = String(input.address || '').trim();
  if (has('gstin')) out.gstin = String(input.gstin || '').trim();
  if (has('notes')) out.notes = String(input.notes || '');
  if (has('archived')) out.archived = !!input.archived;

  return out;
}

const Client = {
  SOURCES,

  count: () => store.clients.count(),

  find: (filter, opts) => store.clients.find(filter, opts),

  findById: (id) => store.clients.findById(id),

  create(input) {
    return store.clients.insert({
      email: '',
      source: 'Direct',
      company: '',
      address: '',
      gstin: '',
      notes: '',
      archived: false,
      ...clean(input),
    });
  },

  /** Returns the list of changed field names alongside the updated doc. */
  update(doc, input) {
    const patch = clean(input, { partial: true });
    const changed = Object.keys(patch).filter((k) => String(patch[k]) !== String(doc[k] ?? ''));
    if (changed.length) store.clients.update(doc, patch);
    return { doc, changed };
  },

  /** Deletes the client and every record attached to it. */
  deleteCascade(id) {
    const _id = String(id);
    store.projects.deleteMany({ client: _id });
    store.payments.deleteMany({ client: _id });
    store.domains.deleteMany({ client: _id });
    store.activities.deleteMany({ client: _id });
    Document.removeForClient(_id);
    return store.clients.deleteOne({ _id });
  },
};

module.exports = Client;
