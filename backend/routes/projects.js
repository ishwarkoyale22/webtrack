const express = require('express');
const Project = require('../models/Project');
const Client = require('../models/Client');
const { logActivity } = require('../utils/activity');
const { clientRef } = require('../utils/populate');
const { upload } = require('../middleware/upload');

const router = express.Router();

/** GET /api/projects — list every project (used by dashboard + filters). */
router.get('/', (req, res, next) => {
  try {
    const { stage = '', priority = '' } = req.query;
    const filter = {};
    if (stage) filter.stage = stage;
    if (priority) filter.priority = priority;

    const projects = Project.find(filter, { sort: 'deadline' }).map((p) => ({
      ...p,
      client: clientRef(p.client, ['name', 'email', 'phone']),
    }));
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

/** GET /api/projects/client/:clientId */
router.get('/client/:clientId', (req, res, next) => {
  try {
    const project = Project.findByClient(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found for this client' });
    return res.json(project);
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /api/projects/client/:clientId
 * Upserts — a client always has exactly one project (One Client = One Website).
 */
router.put('/client/:clientId', (req, res, next) => {
  try {
    const client = Client.findById(req.params.clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const body = req.body || {};
    let project = Project.findByClient(client._id);
    if (!project) {
      project = Project.create(client._id, { ...body, websiteName: body.websiteName || `${client.name} Website` });
    } else {
      const beforeStage = project.stage;
      Project.update(project, body);

      if (body.stage !== undefined && body.stage !== beforeStage) {
        logActivity(client._id, {
          type: 'stage',
          action: 'Project stage changed',
          message: `Stage moved from ${beforeStage} → ${project.stage}.`,
          meta: { from: beforeStage, to: project.stage },
        });
      } else {
        logActivity(client._id, {
          type: 'project',
          action: 'Project updated',
          message: `Project details for "${project.websiteName}" were updated.`,
        });
      }
    }

    return res.json(project);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/projects/client/:clientId/screenshots?type=before|after
 * Accepts up to 6 images per request under the field name `images`.
 */
router.post('/client/:clientId/screenshots', upload.array('images', 6), (req, res, next) => {
  try {
    const type = req.query.type === 'after' ? 'after' : 'before';
    const project = Project.findByClient(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found for this client' });
    if (!req.files || !req.files.length) return res.status(400).json({ message: 'No images uploaded' });

    const shots = req.files.map((f) => ({ url: `/uploads/${f.filename}`, label: req.body.label || '' }));
    Project.addScreenshots(project, type, shots);

    logActivity(project.client, {
      type: 'screenshot',
      action: `${type === 'before' ? 'Before' : 'After'} screenshots uploaded`,
      message: `${shots.length} image(s) added to the ${type} gallery.`,
    });

    return res.status(201).json(project);
  } catch (err) {
    return next(err);
  }
});

/** DELETE /api/projects/client/:clientId/screenshots/:shotId?type=before|after */
router.delete('/client/:clientId/screenshots/:shotId', (req, res, next) => {
  try {
    const type = req.query.type === 'after' ? 'after' : 'before';
    const project = Project.findByClient(req.params.clientId);
    if (!project) return res.status(404).json({ message: 'Project not found for this client' });

    Project.removeScreenshot(project, type, req.params.shotId);

    logActivity(project.client, {
      type: 'screenshot',
      action: 'Screenshot removed',
      message: `An image was removed from the ${type} gallery.`,
    });

    return res.json(project);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
