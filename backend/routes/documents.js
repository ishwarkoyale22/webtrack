const express = require('express');
const fs = require('fs');
const path = require('path');
const store = require('../store');
const Document = require('../models/Document');
const Client = require('../models/Client');
const uploadDocument = require('../middleware/uploadDocument');
const { logActivity } = require('../utils/activity');

const router = express.Router();

const BUCKET = 'documents';
const LOCAL_DIR = path.join(__dirname, '..', 'uploads', 'documents');

// Vercel's filesystem is read-only outside /tmp, and this file is required
// (module-evaluated) on every cold start regardless of storage mode — so
// this directory is only created lazily, and only when local disk is
// actually going to be used (never in Supabase mode).
function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

const safeName = (original) => {
  const ext = path.extname(original).slice(0, 10);
  const base = store.oid();
  return `${base}${ext}`;
};

/** Writes the file wherever this deployment actually persists things. */
async function saveBytes(storedName, buffer, mimeType) {
  if (store.usingSupabase) {
    const { error } = await store.supabaseClient.storage
      .from(BUCKET)
      .upload(storedName, buffer, { contentType: mimeType, upsert: false });
    if (error) throw new Error(`Could not save the file to storage: ${error.message}`);
  } else {
    ensureLocalDir();
    fs.writeFileSync(path.join(LOCAL_DIR, storedName), buffer);
  }
}

/** Reads the file back as a Buffer, wherever it actually lives. */
async function readBytes(storedName) {
  if (store.usingSupabase) {
    const { data, error } = await store.supabaseClient.storage.from(BUCKET).download(storedName);
    if (error) throw new Error(`Could not read the file from storage: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
  return fs.readFileSync(path.join(LOCAL_DIR, storedName));
}

async function removeBytes(storedName) {
  if (store.usingSupabase) {
    await store.supabaseClient.storage.from(BUCKET).remove([storedName]);
  } else {
    try {
      fs.unlinkSync(path.join(LOCAL_DIR, storedName));
    } catch {
      // Already gone — nothing to clean up.
    }
  }
}

const labelFor = { invoice: 'Invoice', quotation: 'Quotation', agreement: 'Agreement' };

/** GET /api/documents/client/:clientId */
router.get('/client/:clientId', (req, res, next) => {
  try {
    if (!Client.findById(req.params.clientId)) return res.status(404).json({ message: 'Client not found' });
    res.json(Document.find(req.params.clientId));
  } catch (err) {
    next(err);
  }
});

/** POST /api/documents/client/:clientId — multipart: file, type. */
router.post('/client/:clientId', uploadDocument.single('file'), async (req, res, next) => {
  try {
    const client = Client.findById(req.params.clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { type } = req.body || {};
    if (!Document.TYPES.includes(type)) {
      return res.status(400).json({ message: `Type must be one of: ${Document.TYPES.join(', ')}` });
    }

    const storedName = safeName(req.file.originalname);
    await saveBytes(storedName, req.file.buffer, req.file.mimetype);

    const doc = Document.create({
      client: client._id,
      type,
      originalName: req.file.originalname,
      storedName,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    logActivity(client._id, {
      type: 'document',
      action: `${labelFor[type]} uploaded`,
      message: `${req.file.originalname} was uploaded as ${labelFor[type].toLowerCase()}.`,
      meta: { documentId: doc._id, size: req.file.size },
    });

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

/** GET /api/documents/:id/download */
router.get('/:id/download', async (req, res, next) => {
  try {
    const doc = Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const buffer = await readBytes(doc.storedName);
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName.replace(/"/g, '')}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/documents/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    const doc = Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    await removeBytes(doc.storedName);
    Document.remove(doc._id);

    logActivity(doc.client, {
      type: 'document',
      action: `${labelFor[doc.type] || 'Document'} removed`,
      message: `${doc.originalName} was removed.`,
      meta: { documentId: doc._id },
    });

    res.json({ message: `${doc.originalName} was deleted`, _id: doc._id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
