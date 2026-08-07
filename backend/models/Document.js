/**
 * Uploaded documents (invoice / quotation / agreement files the admin
 * uploads themselves — separate from the auto-generated PDF feature).
 *
 * This model only ever holds metadata in the store (client, type, original
 * filename, size, mime type). The actual file bytes live elsewhere —
 * backend/uploads/documents/ locally, or the Supabase Storage "documents"
 * bucket in production — handled by routes/documents.js, which is the only
 * place that touches store.supabaseClient / the filesystem directly.
 */
const store = require('../store');

const TYPES = ['invoice', 'quotation', 'agreement'];

const fail = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const Document = {
  TYPES,

  find: (clientId) => store.documents.find({ client: String(clientId) }, { sort: '-createdAt' }),

  findById: (id) => store.documents.findById(id),

  create({ client, type, originalName, storedName, mimeType, size }) {
    if (!TYPES.includes(type)) fail(`Type must be one of: ${TYPES.join(', ')}`);
    return store.documents.insert({
      client: String(client),
      type,
      originalName,
      storedName,
      mimeType,
      size,
    });
  },

  remove(id) {
    return store.documents.deleteOne({ _id: String(id) });
  },

  removeForClient(clientId) {
    return store.documents.deleteMany({ client: String(clientId) });
  },
};

module.exports = Document;
