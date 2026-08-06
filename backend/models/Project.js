const store = require('../store');

const STAGES = ['Discovery', 'Design', 'Development', 'Testing', 'Live'];
const PRIORITIES = ['High', 'Medium', 'Low'];

function clean(input = {}) {
  const out = {};
  if (input.websiteName !== undefined) out.websiteName = String(input.websiteName || '').trim();
  if (input.websiteUrl !== undefined) out.websiteUrl = String(input.websiteUrl || '').trim();
  if (input.stage !== undefined) out.stage = STAGES.includes(input.stage) ? input.stage : 'Discovery';
  if (input.priority !== undefined) out.priority = PRIORITIES.includes(input.priority) ? input.priority : 'Medium';
  if (input.deadline !== undefined) out.deadline = store.toDate(input.deadline);
  if (input.notes !== undefined) out.notes = String(input.notes || '');
  return out;
}

const Project = {
  STAGES,
  PRIORITIES,

  find: (filter, opts) => store.projects.find(filter, opts),

  findByClient: (clientId) => store.projects.findOne({ client: String(clientId) }),

  create(clientId, input = {}) {
    return store.projects.insert({
      client: String(clientId),
      websiteName: 'Website',
      websiteUrl: '',
      stage: 'Discovery',
      deadline: null,
      priority: 'Medium',
      notes: '',
      startedAt: store.nowIso(),
      screenshots: { before: [], after: [] },
      ...clean(input),
    });
  },

  update: (doc, input) => store.projects.update(doc, clean(input)),

  addScreenshots(doc, type, shots) {
    const bucket = type === 'after' ? 'after' : 'before';
    doc.screenshots = doc.screenshots || { before: [], after: [] };
    doc.screenshots[bucket].push(
      ...shots.map((s) => ({ _id: store.oid(), url: s.url, label: s.label || '', uploadedAt: store.nowIso() }))
    );
    return store.projects.touch(doc);
  },

  removeScreenshot(doc, type, shotId) {
    const bucket = type === 'after' ? 'after' : 'before';
    doc.screenshots = doc.screenshots || { before: [], after: [] };
    doc.screenshots[bucket] = doc.screenshots[bucket].filter((s) => String(s._id) !== String(shotId));
    return store.projects.touch(doc);
  },
};

module.exports = Project;
