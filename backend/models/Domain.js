const store = require('../store');

function clean(input = {}) {
  const out = {};
  if (input.domainName !== undefined) out.domainName = String(input.domainName || '').toLowerCase().trim();
  if (input.price !== undefined) out.price = Math.max(Number(input.price) || 0, 0);
  if (input.provider !== undefined) out.provider = String(input.provider || '').trim();
  if (input.hosting !== undefined) out.hosting = String(input.hosting || '').trim();
  if (input.purchaseDate !== undefined) out.purchaseDate = store.toDate(input.purchaseDate);
  if (input.expiryDate !== undefined) out.expiryDate = store.toDate(input.expiryDate);
  return out;
}

const Domain = {
  find: (filter, opts) => store.domains.find(filter, opts),

  findByClient: (clientId) => store.domains.findOne({ client: String(clientId) }),

  create(clientId, input = {}) {
    return store.domains.insert({
      client: String(clientId),
      domainName: '',
      price: 0,
      provider: '',
      hosting: '',
      purchaseDate: null,
      expiryDate: null,
      ...clean(input),
    });
  },

  update: (doc, input) => store.domains.update(doc, clean(input)),
};

module.exports = Domain;
