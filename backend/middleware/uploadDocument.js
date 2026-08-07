const multer = require('multer');

/**
 * Documents (invoices/quotations/agreements the admin uploads) use memory
 * storage — the route decides where the bytes actually go (local disk in
 * dev, Supabase Storage in production), same dual-mode split as the data
 * store itself. See routes/documents.js.
 */
const ALLOWED = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, Word (.doc/.docx) or image files are allowed'));
  },
});

module.exports = uploadDocument;
