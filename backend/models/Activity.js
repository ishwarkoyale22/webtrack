const store = require('../store');

const TYPES = ['client', 'project', 'payment', 'domain', 'note', 'document', 'stage', 'status', 'screenshot'];

const Activity = {
  TYPES,

  find: (filter, opts) => store.activities.find(filter, opts),

  forClient: (clientId, limit = 100) =>
    store.activities.find({ client: String(clientId) }, { sort: '-createdAt', limit }),

  recent: (limit = 12) => store.activities.find({}, { sort: '-createdAt', limit }),

  create({ client, type = 'client', action, message = '', meta = {}, by = 'Admin', createdAt }) {
    const record = store.activities.insert({
      client: String(client),
      type: TYPES.includes(type) ? type : 'client',
      action: String(action),
      message: String(message || ''),
      meta: meta || {},
      by,
    });
    // Seeding back-dates entries so the timeline reads naturally.
    if (createdAt) {
      record.createdAt = store.toDate(createdAt) || record.createdAt;
      store.save('activities');
    }
    return record;
  },

  deleteForClient: (clientId) => store.activities.deleteMany({ client: String(clientId) }),
};

module.exports = Activity;
